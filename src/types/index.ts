import type { NavigatorScreenParams } from '@react-navigation/native';

// Domain Types
export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';
export type GoalType = 'bajar' | 'mantener' | 'subir';
export type GenderType = 'hombre' | 'mujer';
export type NutritionUnit = 'g' | 'ml' | 'oz' | 'unidad' | 'porcion';

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

export interface GeneratedWorkoutExercise {
  name: string;
  sets: number;
  reps: number;
}

export interface GeneratedWorkoutDay {
  name: string;
  scheduled_day: WeekDay;
  exercises: GeneratedWorkoutExercise[];
}

export interface GeneratedWorkoutPlan {
  routineName: string;
  description: string;
  workouts: GeneratedWorkoutDay[];
  source: 'demo' | 'proxy' | 'local';
}

export interface WorkoutLogInput {
  exercise_id: string;
  weight: number;
  reps: number;
  muscle?: string;
}

export interface LogWorkoutSessionResponse {
  workoutLogId: string;
  gainedXp: number;
  totalXp: number;
}

export interface GeneratedWorkoutPlanResponse {
  routineName: string;
  description: string;
  workouts: Array<Workout & { exercises: WorkoutExercise[] }>;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionSummaryResponse {
  date: string;
  logs: FoodLog[];
  totals: MacroTotals;
  targets: MacroTotals;
  remainingCalories: number;
}

export interface BodyPartRank {
  slug: BodySlug;
  intensity: number;
  color: string;
}

export interface RankProgressResponse {
  currentRank: RankInfo & { color: string };
  progressMin: number;
  progressMax: number;
  progressPercent: number;
  isMaxLevel: boolean;
  nextLevelXp: number | null;
}

export interface RankingResponse {
  profile: Profile | null;
  xp: number;
  ranks: RankInfo[];
  leaderboard: Profile[];
  history: Array<{ exercise_id: string; weight: number; reps: number }>;
  muscleData: BodyPartRank[];
  progress: RankProgressResponse;
}

export interface DashboardResponse {
  profile: Profile | null;
  workouts: Workout[];
  requiresOnboarding: boolean;
}

export interface CompleteOnboardingRequest {
  weight: number;
  height: number;
  age: number;
  gender: GenderType;
  goal: GoalType;
}

export interface ProfileMetricsUpdateRequest {
  weight: number;
  height: number;
  goal?: GoalType;
  targetCalories?: number;
}

export interface ProfileUpdateResponse {
  profile: Profile;
  targetCalories: number | null;
}

// Navigation Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  RoutineTab: undefined;
  CreateTab: undefined;
  NutritionTab: undefined;
  RankTab: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Workouts: undefined;
  CreateWorkout: undefined;
  WorkoutDetail: { workoutId: string };
  AddExercises: { workoutId: string };
  LogWorkout: { workoutId: string };
  Ranking: undefined;
  Onboarding: undefined;
  SearchFood: { initialQuery?: string; scannedFood?: FoodSearchResult } | undefined;
  Profile: undefined;
  AIPlanning: undefined;
  CameraScanner: undefined;
  Minigames: undefined;
  PushUpsGame: undefined;
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;

// Database Types
export interface Workout {
  id: string;
  user_id: string;
  name: string;
  description: string;
  scheduled_day?: WeekDay | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  order: number;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_id: string;
  date: string;
}

export interface ExerciseLog {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
}

export interface Profile {
  id: string;
  name: string;
  xp: number;
  weight: number | null;
  height: number | null;
  goal?: GoalType | null;
  target_calories?: number | null;
  created_at: string;
}

export interface FoodLog {
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

export type FatSecretFood = FoodSearchResult;

export interface RankInfo {
  id: number;
  name: string;
  min_xp: number;
  max_xp: number | null;
}

// Exercise Library Types
export interface Exercise {
  name: string;
  type: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
  gifUrl?: string;
}
