export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';
export type GoalType = 'bajar' | 'mantener' | 'subir';
export type GenderType = 'hombre' | 'mujer';
export type NutritionUnit = 'g' | 'ml' | 'oz' | 'unidad' | 'porcion';
export type BodySlug =
  | 'chest'
  | 'deltoids'
  | 'biceps'
  | 'triceps'
  | 'lower-back'
  | 'upper-back'
  | 'quadriceps'
  | 'hamstring'
  | 'gluteal'
  | 'calves'
  | 'abs'
  | 'trapezius';

export interface NutritionServing {
  amount: number;
  unit: NutritionUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  isPer100: boolean;
}

export interface FoodSearchResult {
  food_id: string;
  food_name: string;
  food_description: string;
  brand_name?: string;
  serving: NutritionServing;
  source?: 'demo' | 'proxy' | 'local';
}

export interface ExerciseRecord {
  name: string;
  type: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
  gifUrl?: string;
}

export interface ProfileRecord {
  id: string;
  name?: string | null;
  xp: number | null;
  weight: number | null;
  height: number | null;
  goal?: GoalType | null;
  target_calories?: number | null;
  age?: number | null;
  gender?: GenderType | null;
  username?: string | null;
  bio?: string | null;
  is_public?: boolean | null;
  created_at?: string;
}

export interface RankRecord {
  id: number;
  name: string;
  min_xp: number;
  max_xp: number | null;
}

export interface WorkoutRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  scheduled_day?: WeekDay | null;
  created_at?: string;
}

export interface WorkoutExerciseRecord {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  order: number;
}

export interface FoodLogRecord {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  fatsecret_food_id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  created_at?: string;
}

export interface ExerciseHistoryLog {
  exercise_id: string;
  weight: number;
  reps: number;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BodyPartRank {
  slug: BodySlug;
  intensity: number;
  color: string;
}

export interface RankProgress {
  currentRank: RankRecord & { color: string };
  progressMin: number;
  progressMax: number;
  progressPercent: number;
  isMaxLevel: boolean;
  nextLevelXp: number | null;
}
