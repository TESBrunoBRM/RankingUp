import { calculateMuscleData, calculateRankProgress } from './ranking.calculator';
import type { RankRecord } from './domain.types';

const ranks: RankRecord[] = [
  { id: 1, name: 'Hierro', min_xp: 0, max_xp: 99 },
  { id: 2, name: 'Bronce', min_xp: 100, max_xp: 249 },
  { id: 3, name: 'Plata', min_xp: 250, max_xp: null },
];

describe('ranking calculator', () => {
  it('calculates current rank and progress', () => {
    const progress = calculateRankProgress(120, ranks);

    expect(progress.currentRank.name).toBe('Bronce');
    expect(progress.progressMin).toBe(100);
    expect(progress.progressMax).toBe(249);
    expect(progress.isMaxLevel).toBe(false);
  });

  it('handles max rank', () => {
    const progress = calculateRankProgress(300, ranks);

    expect(progress.currentRank.name).toBe('Plata');
    expect(progress.progressPercent).toBe(100);
    expect(progress.nextLevelXp).toBeNull();
  });

  it('returns partial muscle data from available history', () => {
    const muscleData = calculateMuscleData(
      { id: 'u1', xp: 0, weight: 80, height: 180 },
      ranks,
      [{ exercise_id: 'Press de Banca', weight: 80, reps: 8 }],
    );

    expect(muscleData).toHaveLength(1);
    expect(muscleData[0].slug).toBe('chest');
  });
});
