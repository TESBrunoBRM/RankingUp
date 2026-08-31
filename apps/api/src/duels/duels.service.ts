import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  clampReportedReps,
  DUEL_DAILY_REWARD_LIMIT,
  DUEL_INVITE_TTL_MS,
  DUEL_MAX_DURATION_MS,
  DUEL_XP_REWARD,
  resolveDuel,
  type DuelOutcome,
  type DuelSide,
} from '../domain/duel.rules';
import {
  SupabaseRepository,
  type DuelRow,
  type DuelWithProfilesRow,
} from '../supabase/supabase.repository';

export type DuelPerspective = 'challenger' | 'opponent';

export interface DuelView {
  id: string;
  status: string;
  targetReps: number;
  role: DuelPerspective;
  myReps: number;
  rivalReps: number;
  iFinished: boolean;
  rivalFinished: boolean;
  rival: { id: string; name: string; username: string | null };
  winnerId: string | null;
  outcome: 'won' | 'lost' | 'draw' | null;
  xpAwarded: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string;
}

const asDate = (value: string | null): Date | null => (value ? new Date(value) : null);

@Injectable()
export class DuelsService {
  constructor(private readonly repository: SupabaseRepository) {}

  private toView(row: DuelWithProfilesRow, userId: string): DuelView {
    const isChallenger = row.challenger_id === userId;
    const rivalProfile = isChallenger ? row.opponent : row.challenger;
    const rivalId = isChallenger ? row.opponent_id : row.challenger_id;

    let outcome: DuelView['outcome'] = null;
    if (row.status === 'finished') {
      if (row.winner_id === null) outcome = 'draw';
      else outcome = row.winner_id === userId ? 'won' : 'lost';
    }

    return {
      id: row.id,
      status: row.status,
      targetReps: row.target_reps,
      role: isChallenger ? 'challenger' : 'opponent',
      myReps: isChallenger ? row.challenger_reps : row.opponent_reps,
      rivalReps: isChallenger ? row.opponent_reps : row.challenger_reps,
      iFinished: Boolean(isChallenger ? row.challenger_finished_at : row.opponent_finished_at),
      rivalFinished: Boolean(isChallenger ? row.opponent_finished_at : row.challenger_finished_at),
      rival: {
        id: rivalProfile?.id ?? rivalId,
        name: rivalProfile?.name ?? 'Atleta RankingUp',
        username: rivalProfile?.username ?? null,
      },
      winnerId: row.winner_id,
      outcome,
      xpAwarded: row.xp_awarded,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      expiresAt: row.expires_at,
    };
  }

  private assertParticipant(row: DuelRow, userId: string): DuelPerspective {
    if (row.challenger_id === userId) return 'challenger';
    if (row.opponent_id === userId) return 'opponent';
    throw new ForbiddenException('No participas en este duelo.');
  }

  private async loadView(duelId: string, userId: string): Promise<DuelView> {
    const row = await this.repository.getDuelWithProfiles(duelId);
    if (!row) throw new NotFoundException('Duelo no encontrado.');
    this.assertParticipant(row, userId);
    return this.toView(row, userId);
  }

  async challenge(userId: string, opponentId: string, targetReps: number): Promise<DuelView> {
    if (userId === opponentId) {
      throw new BadRequestException('No puedes retarte a ti mismo.');
    }

    const opponent = await this.repository.getProfile(opponentId);
    if (!opponent) throw new NotFoundException('El rival no existe.');

    // Libera invitaciones caducadas para que el indice de "un duelo abierto por
    // pareja" no bloquee un reto legitimo.
    await this.repository.expireStaleDuels();

    const created = await this.repository.createDuel({
      challenger_id: userId,
      opponent_id: opponentId,
      target_reps: targetReps,
      expires_at: new Date(Date.now() + DUEL_INVITE_TTL_MS).toISOString(),
    });

    return this.loadView(created.id, userId);
  }

  async listOpen(userId: string): Promise<{ incoming: DuelView[]; outgoing: DuelView[]; active: DuelView[] }> {
    await this.repository.expireStaleDuels();
    const rows = await this.repository.listDuelsForUser(userId, ['pending', 'active']);

    const incoming: DuelView[] = [];
    const outgoing: DuelView[] = [];
    const active: DuelView[] = [];

    for (const row of rows) {
      const view = this.toView(row, userId);
      if (view.status === 'active') active.push(view);
      else if (view.role === 'opponent') incoming.push(view);
      else outgoing.push(view);
    }

    return { incoming, outgoing, active };
  }

  async history(userId: string, limit = 20) {
    const rows = await this.repository.listDuelsForUser(userId, ['finished'], limit);
    const record = await this.repository.getDuelRecord(userId);
    return { record, duels: rows.map((row) => this.toView(row, userId)) };
  }

  async accept(duelId: string, userId: string): Promise<DuelView> {
    const row = await this.repository.getDuelById(duelId);
    if (!row) throw new NotFoundException('Duelo no encontrado.');
    if (this.assertParticipant(row, userId) !== 'opponent') {
      throw new ForbiddenException('Solo el retado puede aceptar el duelo.');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('Este duelo ya no esta pendiente.');
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await this.repository.updateDuel(duelId, { status: 'expired', finished_at: new Date().toISOString() });
      throw new BadRequestException('La invitacion caduco.');
    }

    const now = new Date();
    await this.repository.updateDuel(duelId, {
      status: 'active',
      started_at: now.toISOString(),
      expires_at: new Date(now.getTime() + DUEL_MAX_DURATION_MS).toISOString(),
    });

    return this.loadView(duelId, userId);
  }

  async decline(duelId: string, userId: string): Promise<DuelView> {
    const row = await this.repository.getDuelById(duelId);
    if (!row) throw new NotFoundException('Duelo no encontrado.');
    if (this.assertParticipant(row, userId) !== 'opponent') {
      throw new ForbiddenException('Solo el retado puede rechazar el duelo.');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('Este duelo ya no esta pendiente.');
    }

    await this.repository.updateDuel(duelId, {
      status: 'declined',
      finished_at: new Date().toISOString(),
    });
    return this.loadView(duelId, userId);
  }

  async cancel(duelId: string, userId: string): Promise<DuelView> {
    const row = await this.repository.getDuelById(duelId);
    if (!row) throw new NotFoundException('Duelo no encontrado.');
    if (this.assertParticipant(row, userId) !== 'challenger') {
      throw new ForbiddenException('Solo quien reta puede cancelar la invitacion.');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('El duelo ya empezo: usa el reporte de resultado.');
    }

    await this.repository.updateDuel(duelId, {
      status: 'cancelled',
      finished_at: new Date().toISOString(),
    });
    return this.loadView(duelId, userId);
  }

  /**
   * Cierra el lado del jugador que termina. El ganador solo se decide cuando
   * `resolveDuel` puede hacerlo con datos del servidor.
   */
  async report(duelId: string, userId: string, rawReps: number): Promise<DuelView> {
    const row = await this.repository.getDuelById(duelId);
    if (!row) throw new NotFoundException('Duelo no encontrado.');

    const role = this.assertParticipant(row, userId);
    if (row.status !== 'active') {
      throw new BadRequestException('El duelo no esta en curso.');
    }

    const alreadyReported = role === 'challenger' ? row.challenger_finished_at : row.opponent_finished_at;
    if (alreadyReported) {
      throw new BadRequestException('Ya reportaste tu resultado en este duelo.');
    }

    const now = new Date();
    const reps = clampReportedReps(rawReps, row.target_reps);

    const patch: Record<string, unknown> =
      role === 'challenger'
        ? { challenger_reps: reps, challenger_finished_at: now.toISOString() }
        : { opponent_reps: reps, opponent_finished_at: now.toISOString() };

    const updated = await this.repository.updateDuel(duelId, patch);

    const challengerSide: DuelSide = {
      userId: updated.challenger_id,
      reps: updated.challenger_reps,
      finishedAt: asDate(updated.challenger_finished_at),
    };
    const opponentSide: DuelSide = {
      userId: updated.opponent_id,
      reps: updated.opponent_reps,
      finishedAt: asDate(updated.opponent_finished_at),
    };

    const outcome = resolveDuel(challengerSide, opponentSide, updated.target_reps);
    if (outcome) await this.finalize(updated, outcome);

    return this.loadView(duelId, userId);
  }

  private async finalize(row: DuelRow, outcome: DuelOutcome): Promise<void> {
    const now = new Date();
    let xpAwarded = 0;

    if (outcome.winnerId) {
      // Mismo tope que el minijuego individual: limita el farmeo entre cuentas
      // complices sin castigar al que juega de verdad.
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const rewardedToday = await this.repository.countDuelRewardsSince(outcome.winnerId, since);

      if (rewardedToday < DUEL_DAILY_REWARD_LIMIT) {
        const profile = await this.repository.getProfile(outcome.winnerId);
        xpAwarded = DUEL_XP_REWARD;
        await this.repository.updateProfileXp(outcome.winnerId, (profile?.xp ?? 0) + xpAwarded);
      }
    }

    await this.repository.updateDuel(row.id, {
      status: 'finished',
      winner_id: outcome.winnerId,
      xp_awarded: xpAwarded,
      finished_at: now.toISOString(),
    });
  }

  async getState(duelId: string, userId: string): Promise<DuelView> {
    await this.repository.expireStaleDuels();
    return this.loadView(duelId, userId);
  }

  /** Abandono explicito estando el duelo en curso: cuenta como derrota. */
  async forfeit(duelId: string, userId: string): Promise<DuelView> {
    const row = await this.repository.getDuelById(duelId);
    if (!row) throw new NotFoundException('Duelo no encontrado.');

    const role = this.assertParticipant(row, userId);
    if (row.status !== 'active') {
      throw new BadRequestException('El duelo no esta en curso.');
    }

    const rivalId = role === 'challenger' ? row.opponent_id : row.challenger_id;
    await this.finalize(row, { winnerId: rivalId, reason: 'walkover' });
    return this.loadView(duelId, userId);
  }
}
