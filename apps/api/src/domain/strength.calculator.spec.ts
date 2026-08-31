import { calculateExerciseStrength, estimateOneRepMax } from './strength.calculator';

describe('strength calculator', () => {
  it('uses the Strength Level hybrid 1RM method across repetition ranges', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(112.5, 1);
    expect(estimateOneRepMax(100, 9)).toBeCloseTo(129.3, 1);
    expect(estimateOneRepMax(100, 12)).toBe(140);
  });

  it('selects the best set and ranks a male bench press by bodyweight ratio', () => {
    const result = calculateExerciseStrength([
      { exercise_id: 'Press de Banca', weight: 70, reps: 5 },
      { exercise_id: 'Press de Banca', weight: 80, reps: 5 },
    ], 80, 'hombre');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      exerciseName: 'Press de Banca',
      level: 'novato',
      bestWeight: 80,
      bestReps: 5,
      nextLevel: 'intermedio',
      nextLevelOneRepMax: 100,
    });
  });

  it('uses female standards independently from male standards', () => {
    const result = calculateExerciseStrength([
      { exercise_id: 'Press Militar', weight: 35, reps: 1 },
    ], 70, 'mujer');

    expect(result[0].level).toBe('intermedio');
  });

  it('omits unsupported exercises and profiles without required metrics', () => {
    expect(calculateExerciseStrength([{ exercise_id: 'Plancha', weight: 0, reps: 60 }], 80, 'hombre')).toEqual([]);
    expect(calculateExerciseStrength([{ exercise_id: 'Press de Banca', weight: 80, reps: 5 }], null, 'hombre')).toEqual([]);
  });
});
