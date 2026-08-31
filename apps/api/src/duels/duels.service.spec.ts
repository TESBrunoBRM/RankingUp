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
    updateProfileXp: jest.fn(),
    createDuel: jest.fn(),
    getDuelById: jest.fn(),
    getDuelWithProfiles: jest.fn(),
    listDuelsForUser: jest.fn(),
    updateDuel: jest.fn(),
    expireStaleDuels: jest.fn().mockResolvedValue(undefined),
    countDuelRewardsSince: jest.fn(),
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
    repositoryMock.updateDuel.mockResolvedValue(
      buildDuel({ challenger_reps: 30, challenger_finished_at: '2026-08-31T10:02:00.000Z' })
    );
    repositoryMock.countDuelRewardsSince.mockResolvedValue(0);
    repositoryMock.getProfile.mockResolvedValue({ id: CHALLENGER, xp: 400 });
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

    expect(repositoryMock.updateProfileXp).toHaveBeenCalledWith(CHALLENGER, 475);
    expect(repositoryMock.updateDuel).toHaveBeenLastCalledWith(
      DUEL_ID,
      expect.objectContaining({ status: 'finished', winner_id: CHALLENGER, xp_awarded: 75 })
    );
    expect(view.outcome).toBe('won');
  });

  it('still closes the duel but pays no XP past the daily reward cap', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.updateDuel.mockResolvedValue(
      buildDuel({ challenger_reps: 30, challenger_finished_at: '2026-08-31T10:02:00.000Z' })
    );
    repositoryMock.countDuelRewardsSince.mockResolvedValue(5);
    repositoryMock.getDuelWithProfiles.mockResolvedValue(
      withProfiles(buildDuel({ status: 'finished', winner_id: CHALLENGER, xp_awarded: 0 }))
    );

    await service.report(DUEL_ID, CHALLENGER, 30);

    expect(repositoryMock.updateProfileXp).not.toHaveBeenCalled();
    expect(repositoryMock.updateDuel).toHaveBeenLastCalledWith(
      DUEL_ID,
      expect.objectContaining({ status: 'finished', winner_id: CHALLENGER, xp_awarded: 0 })
    );
  });

  it('keeps the duel open when the first report did not reach the target', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.updateDuel.mockResolvedValue(
      buildDuel({ challenger_reps: 12, challenger_finished_at: '2026-08-31T10:02:00.000Z' })
    );
    repositoryMock.getDuelWithProfiles.mockResolvedValue(
      withProfiles(buildDuel({ challenger_reps: 12, challenger_finished_at: '2026-08-31T10:02:00.000Z' }))
    );

    const view = await service.report(DUEL_ID, CHALLENGER, 12);

    expect(repositoryMock.updateDuel).toHaveBeenCalledTimes(1);
    expect(view.status).toBe('active');
  });

  it('clamps an impossible rep count before storing it', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.updateDuel.mockResolvedValue(buildDuel());
    repositoryMock.getDuelWithProfiles.mockResolvedValue(withProfiles(buildDuel()));

    await service.report(DUEL_ID, CHALLENGER, 5000);

    expect(repositoryMock.updateDuel).toHaveBeenCalledWith(
      DUEL_ID,
      expect.objectContaining({ challenger_reps: 60 })
    );
  });

  it('hands the win to the rival when a player forfeits', async () => {
    repositoryMock.getDuelById.mockResolvedValue(buildDuel());
    repositoryMock.countDuelRewardsSince.mockResolvedValue(0);
    repositoryMock.getProfile.mockResolvedValue({ id: OPPONENT, xp: 100 });
    repositoryMock.updateDuel.mockResolvedValue(buildDuel({ status: 'finished', winner_id: OPPONENT }));
    repositoryMock.getDuelWithProfiles.mockResolvedValue(
      withProfiles(buildDuel({ status: 'finished', winner_id: OPPONENT, xp_awarded: 75 }))
    );

    const view = await service.forfeit(DUEL_ID, CHALLENGER);

    expect(repositoryMock.updateProfileXp).toHaveBeenCalledWith(OPPONENT, 175);
    expect(view.outcome).toBe('lost');
  });

  it('blocks strangers from reading a duel they are not part of', async () => {
    repositoryMock.getDuelWithProfiles.mockResolvedValue(withProfiles(buildDuel()));

    await expect(service.getState(DUEL_ID, '44444444-4444-4444-8444-444444444444')).rejects.toThrow(
      ForbiddenException
    );
  });
});
