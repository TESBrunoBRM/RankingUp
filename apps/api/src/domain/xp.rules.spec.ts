import { calculateWorkoutXp, getXpForMuscle, MAX_SESSION_XP } from './xp.rules';

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

  it('caps the XP of a single session', () => {
    // V-01: sin tope, una peticion con 50.000 series otorgaba 750.000 XP.
    const abusive = Array.from({ length: 50_000 }, () => 'Pecho');
    expect(calculateWorkoutXp(abusive)).toBe(MAX_SESSION_XP);
  });
});
