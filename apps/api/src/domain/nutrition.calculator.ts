import type { FoodLogRecord, FoodSearchResult, GoalType, MacroTotals, NutritionUnit, ProfileRecord } from './domain.types';

export interface CalculatedFoodLog {
  foodName: string;
  foodId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
}

export interface NutritionTargets extends MacroTotals {}

export interface NutritionSummary {
  totals: MacroTotals;
  targets: NutritionTargets;
  remainingCalories: number;
}

const roundMacro = (value: number): number => Math.round(value * 10) / 10;

export const calculateServingMultiplier = (
  food: FoodSearchResult,
  amount: number,
  unit: NutritionUnit,
): number => {
  if (amount <= 0) {
    throw new Error('La cantidad debe ser mayor a 0.');
  }

  const serving = food.serving;
  if (serving.isPer100 && unit === serving.unit) {
    return amount / 100;
  }

  if (unit === serving.unit && serving.amount > 0) {
    return amount / serving.amount;
  }

  return amount;
};

export const calculateFoodLog = (
  food: FoodSearchResult,
  amount: number,
  unit: NutritionUnit,
): CalculatedFoodLog => {
  const servings = calculateServingMultiplier(food, amount, unit);
  return {
    foodName: food.food_name,
    foodId: food.food_id,
    calories: roundMacro(food.serving.calories * servings),
    protein: roundMacro(food.serving.protein * servings),
    carbs: roundMacro(food.serving.carbs * servings),
    fat: roundMacro(food.serving.fat * servings),
    servings: roundMacro(servings),
  };
};

export const calculateMacroTotals = (logs: FoodLogRecord[]): MacroTotals => logs.reduce(
  (totals, log) => ({
    calories: totals.calories + (log.calories || 0),
    protein: totals.protein + (log.protein || 0),
    carbs: totals.carbs + (log.carbs || 0),
    fat: totals.fat + (log.fat || 0),
  }),
  { calories: 0, protein: 0, carbs: 0, fat: 0 },
);

export const calculateTargets = (
  targetCalories: number,
  goal?: GoalType | null,
  weight?: number | null,
): NutritionTargets => {
  let protein = Math.round((targetCalories * 0.3) / 4);
  let fat = Math.round((targetCalories * 0.25) / 9);
  let carbs = Math.round((targetCalories * 0.45) / 4);

  if (goal === 'subir' && weight && weight > 0) {
    protein = Math.round(weight * 2.2);
    fat = Math.round((targetCalories * 0.25) / 9);
    carbs = Math.round(Math.max(0, targetCalories - protein * 4 - fat * 9) / 4);
  }

  return { calories: targetCalories, protein, carbs, fat };
};

export const calculateNutritionSummary = (
  logs: FoodLogRecord[],
  profile: ProfileRecord | null,
): NutritionSummary => {
  const targetCalories = profile?.target_calories || 2000;
  const totals = calculateMacroTotals(logs);
  const targets = calculateTargets(targetCalories, profile?.goal, profile?.weight);

  return {
    totals,
    targets,
    remainingCalories: targetCalories - totals.calories,
  };
};
