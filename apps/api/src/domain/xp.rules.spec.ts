import { calculateWorkoutXp, getXpForMuscle } from './xp.rules';

describe('XP rules', () => {
  it('maps Spanish and English muscles', () => {
    expect(getXpForMuscle('Pecho')).toBe(15);
    expect(getXpForMuscle('chest')).toBe(15);
    expect(getXpForMuscle('Bíceps')).toBe(10);
    expect(getXpForMuscle('triceps')).toBe(10);
  });

  it('uses default XP for unknown muscles', () => {
    expect(getXpForMuscle('musculo raro')).toBe(5);
  });

  it('sums XP for multiple sets', () => {
    expect(calculateWorkoutXp(['Pecho', 'Biceps', 'unknown'])).toBe(30);
  });
});
