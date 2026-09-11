import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseRepository, type DuelRow } from '../supabase/supabase.repository';
import { DuelsService } from './duels.service';

const CHALLENGER = '11111111-1111-4111-8111-111111111111';
const OPPONENT = '22222222-2222-4222-8222-222222222222';
const DUEL_ID = '33333333-3333-4333-8333-333333333333';

const buildDuel = (overrides: Partial<DuelRow> = {}): DuelRow => ({
  id: DUEL_ID,
  challenger_id: CHALLENGER,
  opponent_id: OPPONENT,
  game: 'push_ups',
  target_reps: 30,
  status: 'active',
  challenger_reps: 0,
  opponent_reps: 0,
  challenger_finished_at: null,
  opponent_finished_at: null,
  winner_id: null,
  xp_awarded: 0,
  created_at: '2026-08-31T10:00:00.000Z',
  started_at: '2026-08-31T10:00:10.000Z',
  finished_at: null,
  expires_at: '2026-08-31T10:30:00.000Z',
  ...overrides,
});

const withProfiles = (row: DuelRow) => ({
  ...row,
  challenger: { id: CHALLENGER, name: 'Bruno', username: 'bruno' },
  opponent: { id: OPPONENT, name: 'Rival', username: 'rival' },
});

describe('DuelsService', () => {
  const repositoryMock = {
    getProfile: jest.fn(),
    createDuel: jest.fn(),
    getDuelById: jest.fn(),
    getDuelWithProfiles: jest.fn(),
    listDuelsForUser: jest.fn(),
    updateDuel: jest.fn(),
    closeDuelSide: jest.fn(),
    claimDuelFinish: jest.fn(),
    awardDuelXp: jest.fn(),
    expireStaleDuels: jest.fn().mockResolvedValue(undefined),
    getDuelRecord: jest.fn(),
  };

  let service: DuelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DuelsService, { provide: SupabaseRepository, useValue: repositoryMock }],
    }).compile();

    service = module.get(DuelsService);
    jest.clearAllMocks();
    repositoryMock.expireStaleDuels.mockResolvedValue(undefined);
  });

  it('rejects challenging yourself', async () => {
    await expect(service.challenge(CHALLENGER, CHALLENGER, 30)).rejects.toThrow(BadRequestException);
    expect(repositoryMock.createDuel).not.toHaveBeenCalled();
  });

  it('lets only the challenged user accept', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel({ status: 'pending' }));

    await expect(service.accept(DUEL_ID, CHALLENGER)).rejects.toThrow(ForbiddenException);
    expect(repositoryMock.updateDuel).not.toHaveBeenCalled();
  });

  it('refuses a second report from the same player', async () => {
    repositoryMock.getDuelById.mockResolvedValue(
      buildDuel({ challenger_reps: 30, challenger_finished_at: '2026-08-31T10:02:00.000Z' })
    );

    await expect(service.report(DUEL_ID, CHALLENGER, 30)).rejects.toThrow(BadRequestException);
  });

  it('closes the duel and pays XP to whoever reached the target first', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.closeDuelSide.mockResolvedValue(
      buildDuel({ challenger_reps: 30, challenger_finished_at: '2026-08-31T10:02:00.000Z' })
    );
    repositoryMock.claimDuelFinish.mockResolvedValue(
      buildDuel({ status: 'finished', winner_id: CHALLENGER })
    );
    repositoryMock.awardDuelXp.mockResolvedValue({ granted: true, totalXp: 475 });
    repositoryMock.getDuelWithProfiles.mockResolvedValue(
      withProfiles(
        buildDuel({
          status: 'finished',
          challenger_reps: 30,
          winner_id: CHALLENGER,
          xp_awarded: 75,
        })
      )
    );

    const view = await service.report(DUEL_ID, CHALLENGER, 30);

    expect(repositoryMock.claimDuelFinish).toHaveBeenCalledWith(DUEL_ID, CHALLENGER);
    expect(repositoryMock.awardDuelXp).toHaveBeenCalledWith(
      expect.objectContaining({ winnerId: CHALLENGER, duelId: DUEL_ID, xp: 75 })
    );
    expect(view.outcome).toBe('won');
  });

  it('does not pay XP twice when two reports race to finalize', async () => {
    // V-03: la transicion a `finished` la gana una sola peticion. La que pierde
    // la carrera recibe null de claimDuelFinish y no debe repartir recompensa.
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.closeDuelSide.mockResolvedValue(
      buildDuel({ challenger_reps: 30, challenger_finished_at: '2026-08-31T10:02:00.000Z' })
    );
    repositoryMock.claimDuelFinish.mockResolvedValue(null);
    repositoryMock.getDuelWithProfiles.mockResolvedValue(
      withProfiles(buildDuel({ status: 'finished', winner_id: CHALLENGER, xp_awarded: 75 }))
    );

    await service.report(DUEL_ID, CHALLENGER, 30);

    expect(repositoryMock.awardDuelXp).not.toHaveBeenCalled();
  });

  it('ignores a report that lost the race on its own side', async () => {
    // closeDuelSide devuelve null: otra peticion ya cerro este lado del duelo.
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.closeDuelSide.mockResolvedValue(null);
    repositoryMock.getDuelWithProfiles.mockResolvedValue(withProfiles(buildDuel()));

    await service.report(DUEL_ID, CHALLENGER, 30);

    expect(repositoryMock.claimDuelFinish).not.toHaveBeenCalled();
    expect(repositoryMock.awardDuelXp).not.toHaveBeenCalled();
  });

  it('still closes the duel but pays no XP past the daily reward cap', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.closeDuelSide.mockResolvedValue(
      buildDuel({ challenger_reps: 30, challenger_finished_at: '2026-08-31T10:02:00.000Z' })
    );
    repositoryMock.claimDuelFinish.mockResolvedValue(
      buildDuel({ status: 'finished', winner_id: CHALLENGER })
    );
    // El tope vive dentro de la transaccion: la BD responde granted: false.
    repositoryMock.awardDuelXp.mockResolvedValue({ granted: false, totalXp: 400 });
    repositoryMock.getDuelWithProfiles.mockResolvedValue(
      withProfiles(buildDuel({ status: 'finished', winner_id: CHALLENGER, xp_awarded: 0 }))
    );

    const view = await service.report(DUEL_ID, CHALLENGER, 30);

    expect(repositoryMock.claimDuelFinish).toHaveBeenCalledWith(DUEL_ID, CHALLENGER);
    expect(view.xpAwarded).toBe(0);
  });

  it('keeps the duel open when the first report did not reach the target', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.closeDuelSide.mockResolvedValue(
      buildDuel({ challenger_reps: 12, challenger_finished_at: '2026-08-31T10:02:00.000Z' })
    );
    repositoryMock.getDuelWithProfiles.mockResolvedValue(
      withProfiles(buildDuel({ challenger_reps: 12, challenger_finished_at: '2026-08-31T10:02:00.000Z' }))
    );

    const view = await service.report(DUEL_ID, CHALLENGER, 12);

    expect(repositoryMock.claimDuelFinish).not.toHaveBeenCalled();
    expect(view.status).toBe('active');
  });

  it('clamps an impossible rep count before storing it', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.closeDuelSide.mockResolvedValue(buildDuel());
    repositoryMock.getDuelWithProfiles.mockResolvedValue(withProfiles(buildDuel()));

    await service.report(DUEL_ID, CHALLENGER, 5000);

    expect(repositoryMock.closeDuelSide).toHaveBeenCalledWith(
      DUEL_ID,
      'challenger',
      expect.objectContaining({ challenger_reps: 60 })
    );
  });

  it('hands the win to the rival when a player forfeits', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.claimDuelFinish.mockResolvedValue(
      buildDuel({ status: 'finished', winner_id: OPPONENT })
    );
    repositoryMock.awardDuelXp.mockResolvedValue({ granted: true, totalXp: 175 });
    repositoryMock.getDuelWithProfiles.mockResolvedValue(
      withProfiles(buildDuel({ status: 'finished', winner_id: OPPONENT, xp_awarded: 75 }))
    );

    const view = await service.forfeit(DUEL_ID, CHALLENGER);

    expect(repositoryMock.awardDuelXp).toHaveBeenCalledWith(
      expect.objectContaining({ winnerId: OPPONENT, duelId: DUEL_ID, xp: 75 })
    );
    expect(view.outcome).toBe('lost');
  });

  it('blocks strangers from reading a duel they are not part of', async () => {
    repositoryMock.getDuelWithProfiles.mockResolvedValue(withProfiles(buildDuel()));

    await expect(service.getState(DUEL_ID, '44444444-4444-4444-8444-444444444444')).rejects.toThrow(
      ForbiddenException
    );
  });
});
