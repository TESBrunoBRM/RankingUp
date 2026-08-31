/**
 * Reglas de resolucion de un duelo 1v1 de flexiones.
 *
 * Todo se decide con datos del servidor: las repeticiones que reporta cada
 * jugador al terminar y la marca de tiempo en la que el backend recibio ese
 * reporte. Los contadores que viajan por Realtime durante la partida son
 * puramente visuales y no entran aqui.
 */

export const DUEL_XP_REWARD = 75;
export const DUEL_DAILY_REWARD_LIMIT = 5;
export const DUEL_DEFAULT_TARGET_REPS = 30;
export const DUEL_INVITE_TTL_MS = 10 * 60 * 1000;
export const DUEL_MAX_DURATION_MS = 30 * 60 * 1000;

export type DuelStatus = 'pending' | 'active' | 'finished' | 'declined' | 'cancelled' | 'expired';

export interface DuelSide {
  userId: string;
  reps: number;
  finishedAt: Date | null;
}

export interface DuelOutcome {
  winnerId: string | null;
  reason: 'target-first' | 'more-reps' | 'draw' | 'walkover';
}

const reachedTarget = (side: DuelSide, targetReps: number) => side.reps >= targetReps;

/**
 * Devuelve null mientras el duelo no se pueda cerrar todavia (falta un reporte
 * y el otro jugador aun no llego al objetivo).
 */
export const resolveDuel = (
  challenger: DuelSide,
  opponent: DuelSide,
  targetReps: number,
): DuelOutcome | null => {
  const challengerDone = challenger.finishedAt !== null;
  const opponentDone = opponent.finishedAt !== null;

  if (!challengerDone && !opponentDone) return null;

  // Si uno llego al objetivo, el duelo se cierra sin esperar al otro:
  // la carrera ya tiene ganador.
  if (challengerDone && reachedTarget(challenger, targetReps) && !opponentDone) {
    return { winnerId: challenger.userId, reason: 'target-first' };
  }
  if (opponentDone && reachedTarget(opponent, targetReps) && !challengerDone) {
    return { winnerId: opponent.userId, reason: 'target-first' };
  }

  if (!challengerDone || !opponentDone) return null;

  const challengerReached = reachedTarget(challenger, targetReps);
  const opponentReached = reachedTarget(opponent, targetReps);

  if (challengerReached && opponentReached) {
    const challengerTime = challenger.finishedAt!.getTime();
    const opponentTime = opponent.finishedAt!.getTime();
    if (challengerTime === opponentTime) return { winnerId: null, reason: 'draw' };
    return {
      winnerId: challengerTime < opponentTime ? challenger.userId : opponent.userId,
      reason: 'target-first',
    };
  }

  if (challengerReached) return { winnerId: challenger.userId, reason: 'target-first' };
  if (opponentReached) return { winnerId: opponent.userId, reason: 'target-first' };

  if (challenger.reps === opponent.reps) return { winnerId: null, reason: 'draw' };
  return {
    winnerId: challenger.reps > opponent.reps ? challenger.userId : opponent.userId,
    reason: 'more-reps',
  };
};

/**
 * Cierre por abandono: el duelo lleva demasiado tiempo activo y solo uno reporto.
 */
export const resolveAbandonedDuel = (challenger: DuelSide, opponent: DuelSide): DuelOutcome => {
  const challengerDone = challenger.finishedAt !== null;
  const opponentDone = opponent.finishedAt !== null;

  if (challengerDone && !opponentDone) return { winnerId: challenger.userId, reason: 'walkover' };
  if (opponentDone && !challengerDone) return { winnerId: opponent.userId, reason: 'walkover' };
  return { winnerId: null, reason: 'draw' };
};

/**
 * El detector corre en el cliente, asi que el backend acota lo que acepta:
 * ni negativos, ni por encima de un margen razonable sobre el objetivo.
 */
export const clampReportedReps = (reps: number, targetReps: number): number => {
  if (!Number.isFinite(reps) || reps < 0) return 0;
  return Math.min(Math.trunc(reps), targetReps * 2);
};
