import type { GoalType } from './domain.types';

export type GenderType = 'hombre' | 'mujer';

interface TargetCaloriesInput {
  weight: number;
  height: number;
  age: number;
  gender: GenderType;
  goal: GoalType;
}

export const calculateTargetCalories = ({
  weight,
  height,
  age,
  gender,
  goal,
}: TargetCaloriesInput): number => {
  const genderAdjustment = gender === 'hombre' ? 5 : -161;
  const basalMetabolicRate = (10 * weight) + (6.25 * height) - (5 * age) + genderAdjustment;
  const maintenanceCalories = basalMetabolicRate * 1.55;

  if (goal === 'bajar') return Math.round(maintenanceCalories - 500);
  if (goal === 'subir') return Math.round(maintenanceCalories + 500);
  return Math.round(maintenanceCalories);
};

export const assertManualTargetCalories = (targetCalories: number): void => {
  if (!Number.isFinite(targetCalories) || targetCalories < 800 || targetCalories > 7000) {
    throw new Error('El objetivo calorico debe estar entre 800 y 7000 kcal.');
  }
};
