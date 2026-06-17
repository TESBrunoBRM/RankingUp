import { appEnv } from '../config/env';
import { supabase } from '../lib/supabase';
import type {
  CompleteOnboardingRequest,
  DashboardResponse,
  FoodSearchResult,
  GeneratedWorkoutPlanResponse,
  LogWorkoutSessionResponse,
  MealType,
  NutritionSummaryResponse,
  NutritionUnit,
  ProfileMetricsUpdateRequest,
  ProfileUpdateResponse,
  RankingResponse,
  WorkoutLogInput,
} from '../types';

interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
}

interface GeneratePlanRequest {
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  duration: number;
  days: number;
}

interface CreateFoodLogRequest {
  date: string;
  mealType: MealType;
  foodId: string;
  amount: number;
  unit: NutritionUnit;
}

const getApiBaseUrl = () => {
  if (!appEnv.apiProxyUrl) {
    throw new Error('Configura EXPO_PUBLIC_RANKINGUP_API_URL para usar el backend RankingUp.');
  }
  return appEnv.apiProxyUrl.replace(/\/$/, '');
};

const getSessionToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error('Debes iniciar sesion nuevamente.');
  return token;
};

const readErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') return fallback;
  const apiPayload = payload as ApiErrorPayload;
  if (Array.isArray(apiPayload.message)) return apiPayload.message.join('\n');
  if (apiPayload.message) return apiPayload.message;
  if (apiPayload.error) return apiPayload.error;
  return fallback;
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = await getSessionToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw new Error(readErrorMessage(payload, 'No se pudo completar la solicitud al backend.'));
  }

  return payload as T;
};

export const rankingUpApiClient = {
  getDashboard: () => request<DashboardResponse>('/v1/dashboard'),

  getRanking: () => request<RankingResponse>('/v1/ranking'),

  completeOnboarding: (input: CompleteOnboardingRequest) =>
    request<ProfileUpdateResponse>('/v1/profile/onboarding', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateProfileMetrics: (input: ProfileMetricsUpdateRequest) =>
    request<ProfileUpdateResponse>('/v1/profile/metrics', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  logWorkoutSession: (workoutId: string, sets: WorkoutLogInput[]) =>
    request<LogWorkoutSessionResponse>('/v1/workouts/log-session', {
      method: 'POST',
      body: JSON.stringify({
        workoutId,
        sets: sets.map((set) => ({
          exerciseId: set.exercise_id,
          weight: set.weight,
          reps: set.reps,
        })),
      }),
    }),

  generateWorkoutPlan: (input: GeneratePlanRequest) =>
    request<GeneratedWorkoutPlanResponse>('/v1/workouts/generate-plan', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  searchFoods: (query: string) =>
    request<FoodSearchResult[]>(`/v1/foods/search?query=${encodeURIComponent(query)}`),

  getFood: (foodId: string) =>
    request<FoodSearchResult>(`/v1/foods/${encodeURIComponent(foodId)}`),

  findFoodIdByBarcode: (barcode: string) =>
    request<{ food_id: string | null }>(`/v1/foods/barcode/${encodeURIComponent(barcode)}`),

  getNutritionLogs: (date: string) =>
    request<NutritionSummaryResponse>(`/v1/nutrition/logs?date=${encodeURIComponent(date)}`),

  addFoodLog: (input: CreateFoodLogRequest) =>
    request<{ log: NutritionSummaryResponse['logs'][number] }>('/v1/nutrition/logs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deleteFoodLog: (id: string) =>
    request<{ deleted: boolean }>(`/v1/nutrition/logs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  rewardMinigameXp: () =>
    request<{ gainedXp: number; totalXp: number }>('/v1/profile/minigame-xp', {
      method: 'POST',
    }),
};
