import { getFoodById } from './foods.catalog';
import { calculateFoodLog, calculateNutritionSummary } from './nutrition.calculator';

describe('nutrition calculator', () => {
  it('calculates macros for per-100g food', () => {
    const apple = getFoodById('demo-apple');
    expect(apple).not.toBeNull();

    const result = calculateFoodLog(apple!, 200, 'g');

    expect(result.calories).toBe(104);
    expect(result.carbs).toBe(28);
    expect(result.servings).toBe(2);
  });

  it('calculates macros for unit food', () => {
    const egg = getFoodById('demo-egg');
    expect(egg).not.toBeNull();

    const result = calculateFoodLog(egg!, 2, 'unidad');

    expect(result.calories).toBe(144);
    expect(result.protein).toBe(12.6);
  });

  it('rejects invalid amount', () => {
    const apple = getFoodById('demo-apple');
    expect(() => calculateFoodLog(apple!, 0, 'g')).toThrow('mayor a 0');
  });

  it('summarizes targets and remaining calories', () => {
    const summary = calculateNutritionSummary(
      [{ id: '1', user_id: 'u1', date: '2026-06-04', meal_type: 'snack', food_name: 'Manzana', fatsecret_food_id: 'demo-apple', calories: 104, protein: 0.6, carbs: 28, fat: 0.4, servings: 2 }],
      { id: 'u1', xp: 0, weight: 80, height: 180, goal: 'subir', target_calories: 2500 },
    );

    expect(summary.totals.calories).toBe(104);
    expect(summary.targets.protein).toBe(176);
    expect(summary.remainingCalories).toBe(2396);
  });
});
