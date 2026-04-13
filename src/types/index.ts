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
  MainTabs: undefined;
  Workouts: undefined;
  CreateWorkout: undefined;
  WorkoutDetail: { workoutId: string };
  AddExercises: { workoutId: string };
  LogWorkout: { workoutId: string };
  Ranking: undefined;
  Onboarding: undefined;
  SearchFood: undefined;
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;

// Database Types
export interface Workout {
  id: string;
  user_id: string;
  name: string;
  description: string;
  scheduled_day?: string | null;
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
  exercise_id: string; // Refers to the text name from API Ninjas
  weight: number;
  reps: number;
}

export interface Profile {
  id: string;
  name: string;
  xp: number;
  weight: number | null;
  height: number | null;
  goal?: 'bajar' | 'mantener' | 'subir' | null;
  target_calories?: number | null;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: 'desayuno' | 'almuerzo' | 'cena' | 'snack';
  food_name: string;
  fatsecret_food_id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  created_at?: string;
}

export interface FatSecretFood {
  food_id: string;
  food_name: string;
  food_description: string;
  brand_name?: string;
}

export interface RankInfo {
  id: number;
  name: string;
  min_xp: number;
  max_xp: number | null;
}

// External API Types
export interface Exercise {
  name: string;
  type: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
}
