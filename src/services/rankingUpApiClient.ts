import { appEnv } from '../config/env';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type {
  CompleteOnboardingRequest,
  DashboardResponse,
  FoodSearchResult,
  HomeContentResponse,
  GeneratedWorkoutPlanResponse,
  LogWorkoutSessionResponse,
  MealType,
  NutritionSummaryResponse,
  NutritionUnit,
  ProfileMetricsUpdateRequest,
  ProfileComparisonResponse,
  ProfileSearchResult,
  ProfileUpdateResponse,
  RankingResponse,
  SocialProfileResponse,
  WorkoutLogInput,
  CatalogExerciseDetail,
  CatalogFiltersResponse,
  CatalogSearchParams,
  CatalogSearchResponse,
  Duel,
  DuelHistoryResponse,
  OpenDuelsResponse,
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

interface CachedResponse {
  expiresAt: number;
  value: unknown;
}

const API_TIMEOUT_MS = 7000;
const AUTH_SESSION_TIMEOUT_MS = 4000;
const API_CACHE_MS = 15000;
const responseCache = new Map<string, CachedResponse>();
const inFlightRequests = new Map<string, Promise<unknown>>();

const getApiBaseUrl = () => {
  if (!appEnv.apiProxyUrl) {
    throw new Error('Configura EXPO_PUBLIC_RANKINGUP_API_URL para usar el backend RankingUp.');
  }
  return appEnv.apiProxyUrl.replace(/\/$/, '');
};

const getSessionCredentials = async () => {
  const storedSession = useAuthStore.getState().session;
  const storedTokenIsUsable = storedSession?.access_token
    && (!storedSession.expires_at || storedSession.expires_at * 1000 > Date.now() + 30_000);

  if (storedSession && storedTokenIsUsable) {
    return { token: storedSession.access_token, userId: storedSession.user.id };
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const sessionRequest = supabase.auth.getSession();
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Supabase no pudo validar la sesion a tiempo. Intenta iniciar sesion nuevamente.'));
    }, AUTH_SESSION_TIMEOUT_MS);
  });

  const { data, error } = await Promise.race([sessionRequest, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  if (error) throw new Error(error.message);
  const session = data.session;
  if (!session?.access_token) throw new Error('Debes iniciar sesion nuevamente.');
  return { token: session.access_token, userId: session.user.id };
};

const readErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') return fallback;
  const apiPayload = payload as ApiErrorPayload;
  if (Array.isArray(apiPayload.message)) return apiPayload.message.join('\n');
  if (apiPayload.message) return apiPayload.message;
  if (apiPayload.error) return apiPayload.error;
  return fallback;
};

interface RequestOptions {
  /** Los duelos se consultan en bucle mientras hay una partida viva: ahi la
   *  cache de 15 s deja el marcador desfasado, asi que se salta. */
  skipCache?: boolean;
}

const request = async <T>(path: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> => {
  const { token, userId } = await getSessionCredentials();
  const method = (init.method ?? 'GET').toUpperCase();
  const cacheKey = `${userId}:${method}:${path}`;
  const canCache = method === 'GET' && !options.skipCache;
  const cached = canCache ? responseCache.get(cacheKey) : undefined;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const inFlight = canCache ? inFlightRequests.get(cacheKey) : undefined;
  if (inFlight) return inFlight as Promise<T>;

  const execute = async (): Promise<T> => {
    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, API_TIMEOUT_MS);

    try {
      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        signal: controller.signal,
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

      if (canCache) {
        responseCache.set(cacheKey, { value: payload, expiresAt: Date.now() + API_CACHE_MS });
      } else {
        for (const key of responseCache.keys()) {
          if (key.startsWith(`${userId}:`)) responseCache.delete(key);
        }
      }

      return payload as T;
    } catch (error: unknown) {
      if (didTimeout || (error instanceof Error && error.name === 'AbortError')) {
        throw new Error('La API de RankingUp tarda demasiado en responder. Verifica que el servidor este iniciado y en la misma red.');
      }

      if (error instanceof TypeError) {
        throw new Error('No se pudo conectar con la API de RankingUp. Verifica el servidor y tu conexion de red.');
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (canCache) inFlightRequests.delete(cacheKey);
    }
  };

  const requestPromise = execute();
  if (canCache) inFlightRequests.set(cacheKey, requestPromise);

  return requestPromise;
};

export const rankingUpApiClient = {
  getDashboard: () => request<DashboardResponse>('/v1/dashboard'),

  getHomeContent: () => request<HomeContentResponse>('/v1/home-content'),

  searchExercises: (params: CatalogSearchParams = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && `${value}`.length > 0) search.set(key, `${value}`);
    }
    const queryString = search.toString();
    return request<CatalogSearchResponse>(`/v1/exercises${queryString ? `?${queryString}` : ''}`);
  },

  getExerciseFilters: () => request<CatalogFiltersResponse>('/v1/exercises/filters'),

  getExercise: (exerciseId: string) =>
    request<CatalogExerciseDetail>(`/v1/exercises/${encodeURIComponent(exerciseId)}`),

  getExerciseByName: (name: string) =>
    request<CatalogExerciseDetail | null>(`/v1/exercises/by-name?name=${encodeURIComponent(name)}`),

  getExercisesByNames: (names: string[]) => {
    const search = names.map((name) => `name=${encodeURIComponent(name)}`).join('&');
    return request<CatalogExerciseDetail[]>(`/v1/exercises/lookup?${search}`);
  },

  challengeToDuel: (opponentId: string, targetReps: number) =>
    request<Duel>('/v1/duels', {
      method: 'POST',
      body: JSON.stringify({ opponentId, targetReps }),
    }),

  getOpenDuels: () => request<OpenDuelsResponse>('/v1/duels/open', {}, { skipCache: true }),

  getDuelHistory: () => request<DuelHistoryResponse>('/v1/duels/history'),

  getDuel: (duelId: string) =>
    request<Duel>(`/v1/duels/${encodeURIComponent(duelId)}`, {}, { skipCache: true }),

  acceptDuel: (duelId: string) =>
    request<Duel>(`/v1/duels/${encodeURIComponent(duelId)}/accept`, { method: 'POST' }),

  declineDuel: (duelId: string) =>
    request<Duel>(`/v1/duels/${encodeURIComponent(duelId)}/decline`, { method: 'POST' }),

  cancelDuel: (duelId: string) =>
    request<Duel>(`/v1/duels/${encodeURIComponent(duelId)}/cancel`, { method: 'POST' }),

  reportDuel: (duelId: string, reps: number) =>
    request<Duel>(`/v1/duels/${encodeURIComponent(duelId)}/report`, {
      method: 'POST',
      body: JSON.stringify({ reps }),
    }),

  forfeitDuel: (duelId: string) =>
    request<Duel>(`/v1/duels/${encodeURIComponent(duelId)}/forfeit`, { method: 'POST' }),

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

  calculateCalorieTarget: (input: Required<Pick<ProfileMetricsUpdateRequest, 'weight' | 'height' | 'age' | 'gender' | 'goal'>>) =>
    request<{ targetCalories: number }>('/v1/profile/calorie-target', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getOwnProfile: () => request<SocialProfileResponse>('/v1/profile'),

  updateSocialProfile: (input: { name: string; username: string; bio: string; isPublic: boolean }) =>
    request<SocialProfileResponse>('/v1/profile/social', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  searchProfiles: (query: string) =>
    request<ProfileSearchResult[]>(`/v1/profiles/search?query=${encodeURIComponent(query)}`),

  getPublicProfile: (profileId: string) =>
    request<SocialProfileResponse>(`/v1/profiles/${encodeURIComponent(profileId)}`),

  followProfile: (profileId: string) =>
    request<{ following: boolean }>(`/v1/profiles/${encodeURIComponent(profileId)}/follow`, { method: 'POST' }),

  unfollowProfile: (profileId: string) =>
    request<{ following: boolean }>(`/v1/profiles/${encodeURIComponent(profileId)}/follow`, { method: 'DELETE' }),

  compareProfile: (profileId: string) =>
    request<ProfileComparisonResponse>(`/v1/profiles/${encodeURIComponent(profileId)}/comparison`),

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

  rewardMinigameXp: (reps: number) =>
    request<{ gainedXp: number; totalXp: number }>('/v1/profile/minigame-xp', {
      method: 'POST',
      body: JSON.stringify({ reps }),
    }),
};
