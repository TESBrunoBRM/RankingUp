import {
  clampReportedReps,
  resolveAbandonedDuel,
  resolveDuel,
  type DuelSide,
} from './duel.rules';

const side = (userId: string, reps: number, finishedAt: Date | null): DuelSide => ({
  userId,
  reps,
  finishedAt,
});

describe('resolveDuel', () => {
  const target = 30;

  it('keeps the duel open while nobody reported', () => {
    expect(resolveDuel(side('a', 0, null), side('b', 0, null), target)).toBeNull();
  });

  it('closes immediately when the first finisher reached the target', () => {
    const outcome = resolveDuel(side('a', 30, new Date('2026-01-01T10:00:00Z')), side('b', 12, null), target);
    expect(outcome).toEqual({ winnerId: 'a', reason: 'target-first' });
  });

  it('waits for the rival when the first report did not reach the target', () => {
    expect(resolveDuel(side('a', 18, new Date('2026-01-01T10:00:00Z')), side('b', 0, null), target)).toBeNull();
  });

  it('gives the win to whoever reached the target earlier', () => {
    const outcome = resolveDuel(
      side('a', 30, new Date('2026-01-01T10:00:05Z')),
      side('b', 31, new Date('2026-01-01T10:00:03Z')),
      target,
    );
    expect(outcome).toEqual({ winnerId: 'b', reason: 'target-first' });
  });

  it('falls back to rep count when neither reached the target', () => {
    const outcome = resolveDuel(
      side('a', 22, new Date('2026-01-01T10:00:05Z')),
      side('b', 19, new Date('2026-01-01T10:00:03Z')),
      target,
    );
    expect(outcome).toEqual({ winnerId: 'a', reason: 'more-reps' });
  });

  it('reports a draw on identical reps below the target', () => {
    const outcome = resolveDuel(
      side('a', 20, new Date('2026-01-01T10:00:05Z')),
      side('b', 20, new Date('2026-01-01T10:00:09Z')),
      target,
    );
    expect(outcome).toEqual({ winnerId: null, reason: 'draw' });
  });
});

describe('resolveAbandonedDuel', () => {
  it('awards the walkover to the only player that reported', () => {
    expect(resolveAbandonedDuel(side('a', 12, new Date()), side('b', 0, null))).toEqual({
      winnerId: 'a',
      reason: 'walkover',
    });
  });

  it('is a draw when nobody reported', () => {
    expect(resolveAbandonedDuel(side('a', 0, null), side('b', 0, null))).toEqual({
      winnerId: null,
      reason: 'draw',
    });
  });
});

describe('clampReportedReps', () => {
  it('rejects impossible values', () => {
    expect(clampReportedReps(-5, 30)).toBe(0);
    expect(clampReportedReps(Number.NaN, 30)).toBe(0);
    expect(clampReportedReps(9999, 30)).toBe(60);
    expect(clampReportedReps(24.8, 30)).toBe(24);
  });
});
