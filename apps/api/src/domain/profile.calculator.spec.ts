import { assertManualTargetCalories, calculateTargetCalories } from './profile.calculator';

describe('profile calculator', () => {
  it('calculates target calories with goal adjustment', () => {
    const maintain = calculateTargetCalories({
      weight: 75,
      height: 175,
      age: 25,
      gender: 'hombre',
      goal: 'mantener',
    });

    expect(maintain).toBe(2672);
    expect(calculateTargetCalories({
      weight: 75,
      height: 175,
      age: 25,
      gender: 'hombre',
      goal: 'bajar',
    })).toBe(2172);
    expect(calculateTargetCalories({
      weight: 75,
      height: 175,
      age: 25,
      gender: 'hombre',
      goal: 'subir',
    })).toBe(3172);
  });

  it('uses the female metabolic adjustment', () => {
    expect(calculateTargetCalories({
      weight: 60,
      height: 165,
      age: 30,
      gender: 'mujer',
      goal: 'mantener',
    })).toBe(2046);
  });

  it('rejects unsafe manual calorie targets', () => {
    expect(() => assertManualTargetCalories(799)).toThrow('entre 800 y 7000');
    expect(() => assertManualTargetCalories(7001)).toThrow('entre 800 y 7000');
    expect(() => assertManualTargetCalories(2400)).not.toThrow();
  });
});
