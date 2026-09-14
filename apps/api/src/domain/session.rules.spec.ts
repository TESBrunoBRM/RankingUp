import { calculateSessionXp, calculateVolume, detectPersonalRecords } from './session.rules';

describe('session rules', () => {
  it('excludes warmup and drop sets from volume and XP', () => {
    const sets = [
      { exerciseId: 'bench', weight: 100, reps: 10, kind: 'normal' as const },
      { exerciseId: 'bench', weight: 50, reps: 10, kind: 'warmup' as const },
      { exerciseId: 'bench', weight: 40, reps: 10, kind: 'drop' as const },
    ];
    expect(calculateVolume(sets)).toBe(1000);
    expect(calculateSessionXp(sets, ['chest', 'chest', 'chest'], [])).toBe(15);
  });

  it('reports at most one record per exercise and skips the first session', () => {
    const sets = [{ exerciseId: 'bench', weight: 80, reps: 8 }, { exerciseId: 'bench', weight: 90, reps: 8 }];
    expect(detectPersonalRecords(sets, new Map())).toEqual([]);
    expect(detectPersonalRecords(sets, new Map([['bench', 100]]))).toEqual([
      { exerciseId: 'bench', previous: 100, current: expect.any(Number) },
    ]);
  });

  it('caps XP after record bonuses', () => {
    const sets = Array.from({ length: 30 }, (_, i) => ({ exerciseId: `ex${i}`, weight: 100, reps: 10 }));
    const records = Array.from({ length: 5 }, (_, i) => ({ exerciseId: `ex${i}`, previous: 1, current: 2 }));
    expect(calculateSessionXp(sets, sets.map(() => 'chest'), records)).toBe(300);
  });
});
