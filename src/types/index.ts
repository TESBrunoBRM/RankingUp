import type { NavigatorScreenParams } from '@react-navigation/native';

// Domain Types
export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';
export type GoalType = 'bajar' | 'mantener' | 'subir';
export type GenderType = 'hombre' | 'mujer';
export type NutritionUnit = 'g' | 'ml' | 'oz' | 'unidad' | 'porcion';
export type StrengthLevelName = 'sin-clasificar' | 'principiante' | 'novato' | 'intermedio' | 'avanzado' | 'elite';

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

export interface HomeMessage {
  id: string;
  kind: 'motivacion' | 'sabias-que';
  text: string;
}

export interface FitnessNewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
}

export interface HomeContentResponse {
  messages: HomeMessage[];
  news: FitnessNewsItem[];
  newsStatus: 'live' | 'fallback';
  refreshedAt: string;
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
  age?: number;
  gender?: GenderType;
}

export interface ProfileUpdateResponse {
  profile: Profile;
  targetCalories: number | null;
}

export interface ExerciseStrengthLevel {
  exerciseId: string;
  exerciseName: string;
  level: StrengthLevelName;
  estimatedOneRepMax: number;
  bodyweightRatio: number;
  bestWeight: number;
  bestReps: number;
  nextLevel: StrengthLevelName | null;
  nextLevelOneRepMax: number | null;
  sourceUrl: string;
}

export interface SocialProfile {
  id: string;
  name: string;
  username: string;
  bio: string;
  xp: number;
  isPublic: boolean;
  createdAt: string | null;
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: GenderType | null;
  goal?: GoalType | null;
  targetCalories?: number | null;
}

export interface SocialProfileResponse {
  profile: SocialProfile;
  stats: { followers: number; following: number; workouts: number };
  strengths: ExerciseStrengthLevel[];
  isFollowing: boolean;
  isOwnProfile: boolean;
}

export interface ProfileSearchResult extends SocialProfile {
  isFollowing: boolean;
}

export interface ProfileComparisonRow {
  exerciseName: string;
  viewer: ExerciseStrengthLevel | null;
  other: ExerciseStrengthLevel | null;
  winner: 'viewer' | 'other' | 'tie';
}

export interface ProfileComparisonResponse {
  viewer: SocialProfile;
  other: SocialProfile;
  exercises: ProfileComparisonRow[];
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
  SearchFood: { initialQuery?: string } | undefined;
  Profile: undefined;
  DiscoverProfiles: undefined;
  PublicProfile: { profileId: string };
  ProfileComparison: { profileId: string };
  AIPlanning: undefined;
  CameraScanner: undefined;
  Minigames: undefined;
  PushUpsGame: undefined;
  DuelLobby: undefined;
  Duel: { duelId: string };
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
  age?: number | null;
  gender?: GenderType | null;
  username?: string | null;
  bio?: string | null;
  is_public?: boolean | null;
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


// --- Catalogo de ejercicios (dataset hasaneyldrm/exercises-dataset) ---------

export interface CatalogExerciseSummary {
  id: string;
  name: string;
  bodyPart: string;
  bodyPartLabel: string;
  equipment: string;
  equipmentLabel: string;
  target: string;
  targetLabel: string;
  thumbnailUrl: string | null;
  gifUrl: string | null;
}

export interface CatalogExerciseDetail extends CatalogExerciseSummary {
  muscleGroupLabel: string;
  secondaryMuscleLabels: string[];
  instructions: string;
  steps: string[];
  attribution: string | null;
}

export interface CatalogSearchResponse {
  items: CatalogExerciseSummary[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface CatalogFacet {
  value: string;
  label: string;
  count: number;
}

export interface CatalogFiltersResponse {
  bodyParts: CatalogFacet[];
  equipment: CatalogFacet[];
  targets: CatalogFacet[];
  total: number;
}

export interface CatalogSearchParams {
  query?: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
  page?: number;
  pageSize?: number;
}


// --- Duelos 1v1 de flexiones ------------------------------------------------

export type DuelStatus = 'pending' | 'active' | 'finished' | 'declined' | 'cancelled' | 'expired';
export type DuelRole = 'challenger' | 'opponent';
export type DuelOutcome = 'won' | 'lost' | 'draw';

export interface Duel {
  id: string;
  status: DuelStatus;
  targetReps: number;
  role: DuelRole;
  myReps: number;
  rivalReps: number;
  iFinished: boolean;
  rivalFinished: boolean;
  rival: { id: string; name: string; username: string | null };
  winnerId: string | null;
  outcome: DuelOutcome | null;
  xpAwarded: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string;
}

export interface OpenDuelsResponse {
  incoming: Duel[];
  outgoing: Duel[];
  active: Duel[];
}

export interface DuelHistoryResponse {
  record: { wins: number; losses: number; draws: number };
  duels: Duel[];
}
