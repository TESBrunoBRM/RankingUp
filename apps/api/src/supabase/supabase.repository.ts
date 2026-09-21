import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type {
  FoodLogRecord,
  FoodScanAnalysisRecord,
  FoodSubmissionRecord,
  MealType,
  ProfileRecord,
  RankRecord,
  WeekDay,
  WorkoutExerciseRecord,
  WorkoutRecord,
  ExerciseHistoryLog,
  WaterLogRecord,
  FoodAnalysisMode,
  FoodSubmissionStatus,
  NutritionUnit,
} from '../domain/domain.types';
import type { SetKind } from '../domain/session.rules';
import { SupabaseService } from './supabase.service';

interface WorkoutLogRecord {
  id: string;
}

export interface SessionPerformanceRow {
  exercise_id: string;
  last_date: string;
  sets: Array<{ setIndex: number; weight: number; reps: number }>;
  best_weight: number;
  best_reps: number;
  best_one_rm: number;
}

export interface RecentExerciseSessionRow {
  exercise_id: string;
  session_date: string;
  sets: Array<{ setIndex: number; weight: number; reps: number }>;
}

export interface WorkoutSessionRow {
  id: string;
  workout_id: string;
  user_id: string;
  date: string;
  name: string | null;
  duration_seconds: number | null;
  total_volume: number;
  xp_awarded: number;
  exercise_logs?: Array<{ id: string; exercise_id: string; weight: number; reps: number; set_index: number; kind: SetKind; is_pr: boolean }>;
}

interface InsertFoodLogInput {
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
}

interface InsertFoodScanAnalysisInput {
  user_id: string;
  image_path: string;
  mode: FoodAnalysisMode;
  food_name: string;
  brand_name: string | null;
  serving_amount: number;
  serving_unit: NutritionUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  notes: string | null;
}

interface InsertFoodSubmissionInput {
  submitted_by: string;
  scan_analysis_id: string | null;
  food_name: string;
  brand_name: string | null;
  barcode: string | null;
  serving_amount: number;
  serving_unit: NutritionUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_path: string;
  source_mode: 'nutrition_label' | 'ai_estimate';
  submitter_notes: string | null;
}

interface InsertWorkoutInput {
  user_id: string;
  name: string;
  description: string;
  scheduled_day: WeekDay;
}

interface InsertWorkoutExerciseInput {
  workout_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  order: number;
}

interface UpdateProfileMetricsInput {
  weight: number;
  height: number;
  goal?: ProfileRecord['goal'];
  target_calories?: number;
  age?: number;
  gender?: ProfileRecord['gender'];
}

export interface DuelRow {
  id: string;
  challenger_id: string;
  opponent_id: string;
  game: string;
  target_reps: number;
  status: string;
  challenger_reps: number;
  opponent_reps: number;
  challenger_finished_at: string | null;
  opponent_finished_at: string | null;
  winner_id: string | null;
  xp_awarded: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  expires_at: string;
}

export interface DuelWithProfilesRow extends DuelRow {
  challenger: { id: string; name: string | null; username: string | null } | null;
  opponent: { id: string; name: string | null; username: string | null } | null;
}

export interface ExerciseCatalogRow {
  id: string;
  name: string;
  body_part: string | null;
  equipment: string | null;
  target: string | null;
  muscle_group: string | null;
  secondary_muscles: string[] | null;
  instructions_es: string | null;
  instructions_en: string | null;
  steps_es: string[] | null;
  steps_en: string[] | null;
  image_path: string | null;
  gif_path: string | null;
  attribution: string | null;
}

export interface ExerciseCatalogFilters {
  query?: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
  offset: number;
  limit: number;
}

interface InsertMinigameSessionInput {
  user_id: string;
  game: string;
  reps: number;
  xp_awarded: number;
}

interface UpdateSocialProfileInput {
  name: string;
  username: string;
  bio: string;
  is_public: boolean;
}

const toServerError = (message: string): InternalServerErrorException =>
  new InternalServerErrorException(message);

/** Neutraliza los comodines de LIKE (`%`, `_`) y su caracter de escape. */
const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class SupabaseRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.serviceClient;
  }

  async getWorkoutForUser(workoutId: string, userId: string): Promise<WorkoutRecord | null> {
    const { data, error } = await this.db
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return data as WorkoutRecord | null;
  }

  async getWorkouts(userId: string): Promise<WorkoutRecord[]> {
    const { data, error } = await this.db
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw toServerError(error.message);
    return (data ?? []) as WorkoutRecord[];
  }

  async createWorkout(input: InsertWorkoutInput): Promise<WorkoutRecord> {
    const { data, error } = await this.db
      .from('workouts')
      .insert([input])
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as WorkoutRecord;
  }

  async addWorkoutExercise(input: InsertWorkoutExerciseInput): Promise<WorkoutExerciseRecord> {
    const { data, error } = await this.db
      .from('workout_exercises')
      .insert([input])
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as WorkoutExerciseRecord;
  }

  async createWorkoutLog(userId: string, workoutId: string): Promise<WorkoutLogRecord> {
    const { data, error } = await this.db
      .from('workout_logs')
      .insert([{ user_id: userId, workout_id: workoutId, date: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as WorkoutLogRecord;
  }

  async insertExerciseLogs(
    workoutLogId: string,
    sets: { exercise_id: string; weight: number; reps: number }[],
  ): Promise<void> {
    const { error } = await this.db
      .from('exercise_logs')
      .insert(sets.map((set) => ({ workout_log_id: workoutLogId, ...set })));

    if (error) throw toServerError(error.message);
  }

  async getProfile(userId: string): Promise<ProfileRecord | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return data as ProfileRecord | null;
  }

  /**
   * Incremento relativo y atomico (`xp = xp + n` en la BD). Sustituye al viejo
   * read-modify-write desde la aplicacion, que perdia sumas concurrentes.
   */
  async incrementProfileXp(userId: string, amount: number): Promise<number> {
    const { data, error } = await this.db.rpc('increment_profile_xp', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (error) throw toServerError(error.message);
    return (data as number | null) ?? 0;
  }

  /**
   * Cuenta el tope diario, inserta la sesion y suma el XP en una sola
   * transaccion. `granted: false` significa que el tope ya estaba alcanzado.
   */
  async awardMinigameXp(input: {
    userId: string;
    game: string;
    reps: number;
    xp: number;
    dailyLimit: number;
  }): Promise<{ granted: boolean; totalXp: number; rewardsToday: number }> {
    const { data, error } = await this.db.rpc('award_minigame_xp', {
      p_user_id: input.userId,
      p_game: input.game,
      p_reps: input.reps,
      p_xp: input.xp,
      p_daily_limit: input.dailyLimit,
    });

    if (error) throw toServerError(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { granted: boolean; total_xp: number; rewards_today: number }
      | undefined;

    return {
      granted: row?.granted ?? false,
      totalXp: row?.total_xp ?? 0,
      rewardsToday: row?.rewards_today ?? 0,
    };
  }

  /** Mismo patron que `awardMinigameXp`, para el tope diario de duelos. */
  async awardDuelXp(input: {
    winnerId: string;
    duelId: string;
    xp: number;
    dailyLimit: number;
  }): Promise<{ granted: boolean; totalXp: number }> {
    const { data, error } = await this.db.rpc('award_duel_xp', {
      p_winner_id: input.winnerId,
      p_duel_id: input.duelId,
      p_xp: input.xp,
      p_daily_limit: input.dailyLimit,
    });

    if (error) throw toServerError(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { granted: boolean; total_xp: number }
      | undefined;

    return { granted: row?.granted ?? false, totalXp: row?.total_xp ?? 0 };
  }

  private static readonly CATALOG_COLUMNS =
    'id,name,body_part,equipment,target,muscle_group,secondary_muscles,instructions_es,instructions_en,steps_es,steps_en,image_path,gif_path,attribution';

  async searchExerciseCatalog(
    filters: ExerciseCatalogFilters,
  ): Promise<{ items: ExerciseCatalogRow[]; total: number }> {
    let request = this.db
      .from('exercises')
      .select(SupabaseRepository.CATALOG_COLUMNS, { count: 'exact' })
      .not('body_part', 'is', null);

    if (filters.bodyPart) request = request.eq('body_part', filters.bodyPart);
    if (filters.equipment) request = request.eq('equipment', filters.equipment);
    if (filters.target) request = request.eq('target', filters.target);
    // search_text es una columna generada (lower(name + target + body_part + equipment
    // + muscle_group)) con indice GIN trigram detras.
    if (filters.query) request = request.like('search_text', `%${filters.query}%`);

    const { data, error, count } = await request
      .order('name', { ascending: true })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (error) throw toServerError(error.message);
    return { items: (data ?? []) as unknown as ExerciseCatalogRow[], total: count ?? 0 };
  }

  async findExerciseCatalogEntryByName(name: string): Promise<ExerciseCatalogRow | null> {
    const { data, error } = await this.db
      .from('exercises')
      .select(SupabaseRepository.CATALOG_COLUMNS)
      .ilike('name', name)
      .limit(1)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return (data as unknown as ExerciseCatalogRow) ?? null;
  }

  async findExerciseCatalogEntriesByNames(names: string[]): Promise<ExerciseCatalogRow[]> {
    if (names.length === 0) return [];

    // Los nombres del dataset estan en minusculas, pero exercise_id guarda lo
    // que se escribio en su dia: se consultan ambas variantes.
    const variants = [...new Set([...names, ...names.map((name) => name.toLowerCase())])];

    const { data, error } = await this.db
      .from('exercises')
      .select(SupabaseRepository.CATALOG_COLUMNS)
      .in('name', variants);

    if (error) throw toServerError(error.message);
    return (data ?? []) as unknown as ExerciseCatalogRow[];
  }

  async getExerciseTargetsByNames(names: string[]): Promise<Map<string, string>> {
    if (names.length === 0) return new Map();

    const { data, error } = await this.db
      .from('exercises')
      .select('name,target,muscle_group')
      .in('name', names);

    if (error) throw toServerError(error.message);

    const result = new Map<string, string>();
    for (const row of (data ?? []) as { name: string; target: string | null; muscle_group: string | null }[]) {
      const muscle = row.target ?? row.muscle_group;
      if (muscle) result.set(row.name.toLowerCase(), muscle);
    }
    return result;
  }

  async getExerciseCatalogEntry(id: string): Promise<ExerciseCatalogRow | null> {
    const { data, error } = await this.db
      .from('exercises')
      .select(SupabaseRepository.CATALOG_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return (data as unknown as ExerciseCatalogRow) ?? null;
  }

  async getExerciseCatalogFacetRows(): Promise<Pick<ExerciseCatalogRow, 'body_part' | 'equipment' | 'target'>[]> {
    const { data, error } = await this.db
      .from('exercises')
      .select('body_part,equipment,target')
      .not('body_part', 'is', null);

    if (error) throw toServerError(error.message);
    return (data ?? []) as Pick<ExerciseCatalogRow, 'body_part' | 'equipment' | 'target'>[];
  }

  private static readonly DUEL_COLUMNS = '*';
  private static readonly DUEL_WITH_PROFILES =
    '*,challenger:profiles!duels_challenger_id_fkey(id,name,username),opponent:profiles!duels_opponent_id_fkey(id,name,username)';

  async createDuel(input: {
    challenger_id: string;
    opponent_id: string;
    target_reps: number;
    expires_at: string;
  }): Promise<DuelRow> {
    const { data, error } = await this.db.from('duels').insert([input]).select().single();

    if (error) {
      // 23505 = unique_violation contra duels_single_open_per_pair.
      if (error.code === '23505') {
        throw new ConflictException('Ya tienes un duelo abierto con este usuario.');
      }
      throw toServerError(error.message);
    }
    return data as DuelRow;
  }

  async getDuelById(duelId: string): Promise<DuelRow | null> {
    const { data, error } = await this.db
      .from('duels')
      .select(SupabaseRepository.DUEL_COLUMNS)
      .eq('id', duelId)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return (data as DuelRow) ?? null;
  }

  async getDuelWithProfiles(duelId: string): Promise<DuelWithProfilesRow | null> {
    const { data, error } = await this.db
      .from('duels')
      .select(SupabaseRepository.DUEL_WITH_PROFILES)
      .eq('id', duelId)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return (data as unknown as DuelWithProfilesRow) ?? null;
  }

  async listDuelsForUser(userId: string, statuses: string[], limit = 20): Promise<DuelWithProfilesRow[]> {
    const { data, error } = await this.db
      .from('duels')
      .select(SupabaseRepository.DUEL_WITH_PROFILES)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .in('status', statuses)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw toServerError(error.message);
    return (data ?? []) as unknown as DuelWithProfilesRow[];
  }

  async updateDuel(duelId: string, patch: Record<string, unknown>): Promise<DuelRow> {
    const { data, error } = await this.db
      .from('duels')
      .update(patch)
      .eq('id', duelId)
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as DuelRow;
  }

  /**
   * Cierra el lado de un jugador solo si el duelo sigue activo y ese lado no
   * habia reportado todavia. La condicion viaja dentro del UPDATE, asi que dos
   * peticiones concurrentes no pueden pasarla las dos.
   *
   * Devuelve null si otra peticion se adelanto.
   */
  async closeDuelSide(
    duelId: string,
    role: 'challenger' | 'opponent',
    patch: Record<string, unknown>,
  ): Promise<DuelRow | null> {
    const finishedColumn = role === 'challenger' ? 'challenger_finished_at' : 'opponent_finished_at';
    const { data, error } = await this.db
      .from('duels')
      .update(patch)
      .eq('id', duelId)
      .eq('status', 'active')
      .is(finishedColumn, null)
      .select()
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return (data as DuelRow) ?? null;
  }

  /**
   * Transicion a `finished` con concurrencia optimista: solo quien consigue
   * cambiar la fila reparte XP. Evita que dos reportes simultaneos finalicen
   * el mismo duelo y paguen la recompensa dos veces.
   */
  async claimDuelFinish(duelId: string, winnerId: string | null): Promise<DuelRow | null> {
    const { data, error } = await this.db
      .from('duels')
      .update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() })
      .eq('id', duelId)
      .eq('status', 'active')
      .select()
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return (data as DuelRow) ?? null;
  }

  /**
   * Cierra invitaciones caducadas antes de leer o crear duelos, para que el
   * indice unico de "un duelo abierto por pareja" no bloquee retos nuevos.
   */
  async expireStaleDuels(): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.db
      .from('duels')
      .update({ status: 'expired', finished_at: now })
      .in('status', ['pending', 'active'])
      .lt('expires_at', now);

    if (error) throw toServerError(error.message);
  }

  async countDuelRewardsSince(userId: string, since: Date): Promise<number> {
    const { count, error } = await this.db
      .from('duels')
      .select('id', { count: 'exact', head: true })
      .eq('winner_id', userId)
      .gt('xp_awarded', 0)
      .gte('finished_at', since.toISOString());

    if (error) throw toServerError(error.message);
    return count ?? 0;
  }

  async getDuelRecord(userId: string): Promise<{ wins: number; losses: number; draws: number }> {
    const { data, error } = await this.db
      .from('duels')
      .select('winner_id,challenger_id,opponent_id')
      .eq('status', 'finished')
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`);

    if (error) throw toServerError(error.message);

    let wins = 0;
    let losses = 0;
    let draws = 0;
    for (const row of (data ?? []) as { winner_id: string | null }[]) {
      if (row.winner_id === null) draws += 1;
      else if (row.winner_id === userId) wins += 1;
      else losses += 1;
    }
    return { wins, losses, draws };
  }

  async countMinigameSessionsSince(userId: string, since: Date, game: string): Promise<number> {
    const { count, error } = await this.db
      .from('minigame_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('game', game)
      .gte('created_at', since.toISOString());

    if (error) throw toServerError(error.message);
    return count ?? 0;
  }

  async getWorkoutSessionPreview(workoutId: string): Promise<WorkoutExerciseRecord[]> {
    const { data, error } = await this.db.from('workout_exercises').select('*')
      .eq('workout_id', workoutId).order('order', { ascending: true });
    if (error) throw toServerError(error.message);
    return (data ?? []) as WorkoutExerciseRecord[];
  }

  async getLastExercisePerformance(userId: string, exerciseIds: string[]): Promise<SessionPerformanceRow[]> {
    if (!exerciseIds.length) return [];
    const { data, error } = await this.db.rpc('get_last_exercise_performance', {
      p_user_id: userId, p_exercise_ids: exerciseIds,
    });
    if (error) throw toServerError(error.message);
    return (data ?? []) as SessionPerformanceRow[];
  }

  async getRecentExerciseSessions(userId: string, exerciseIds: string[]): Promise<RecentExerciseSessionRow[]> {
    if (!exerciseIds.length) return [];
    const { data, error } = await this.db.rpc('get_recent_exercise_sessions', {
      p_user_id: userId, p_exercise_ids: exerciseIds,
    });
    if (error) throw toServerError(error.message);
    return (data ?? []) as RecentExerciseSessionRow[];
  }

  async completeWorkoutSession(input: {
    userId: string; workoutId: string; startedAt: string; durationSeconds: number;
    name: string; totalVolume: number; xp: number;
    clientSessionId?: string;
    sets: Array<{ exercise_id: string; weight: number; reps: number; set_index: number; kind: SetKind; is_pr: boolean }>;
  }): Promise<{ workoutLogId: string; totalXp: number }> {
    const { data, error } = await this.db.rpc('complete_workout_session', {
      p_user_id: input.userId, p_workout_id: input.workoutId,
      p_started_at: input.startedAt, p_duration_seconds: input.durationSeconds,
      p_name: input.name, p_total_volume: input.totalVolume, p_xp: input.xp,
      p_sets: input.sets,
      p_client_session_id: input.clientSessionId ?? null,
    });
    if (error) throw toServerError(error.message);
    const row = (data as Array<{ workout_log_id: string; total_xp: number }> | null)?.[0];
    if (!row) throw toServerError('No se pudo guardar la sesion.');
    return { workoutLogId: row.workout_log_id, totalXp: row.total_xp };
  }

  async getWorkoutHistory(userId: string, limit: number, before?: string): Promise<WorkoutSessionRow[]> {
    let query = this.db.from('workout_logs')
      .select('id, workout_id, user_id, date, name, duration_seconds, total_volume, xp_awarded')
      .eq('user_id', userId).order('date', { ascending: false }).limit(limit);
    if (before) query = query.lt('date', before);
    const { data, error } = await query;
    if (error) throw toServerError(error.message);
    return (data ?? []) as WorkoutSessionRow[];
  }

  async getWorkoutHistoryDetail(userId: string, logId: string): Promise<WorkoutSessionRow | null> {
    const { data, error } = await this.db.from('workout_logs')
      .select('id, workout_id, user_id, date, name, duration_seconds, total_volume, xp_awarded, exercise_logs(id, exercise_id, weight, reps, set_index, kind, is_pr)')
      .eq('user_id', userId).eq('id', logId).maybeSingle();
    if (error) throw toServerError(error.message);
    return data as WorkoutSessionRow | null;
  }

  async getExerciseProgress(userId: string, exerciseName: string): Promise<Array<{ date: string; weight: number; reps: number; kind: SetKind }>> {
    const { data, error } = await this.db.from('workout_logs')
      .select('date, exercise_logs!inner(weight, reps, kind, exercise_id)')
      .eq('user_id', userId).eq('exercise_logs.exercise_id', exerciseName)
      .order('date', { ascending: true }).limit(200);
    if (error) throw toServerError(error.message);
    return ((data ?? []) as Array<{ date: string; exercise_logs: Array<{ weight: number; reps: number; kind: SetKind }> }>).flatMap((row) =>
      row.exercise_logs.map((set) => ({ date: row.date, ...set })));
  }

  async recordActivityDay(userId: string, localDate: string): Promise<{ current_streak: number; longest_streak: number; is_new_day: boolean }> {
    const { data, error } = await this.db.rpc('record_activity_day', {
      p_user_id: userId,
      p_local_date: localDate,
      p_source: 'home',
    });
    if (error) throw toServerError(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { current_streak: number; longest_streak: number; is_new_day: boolean }
      | undefined;
    if (!row) throw toServerError('No se pudo registrar el dia activo.');
    return row;
  }

  async getActivityDays(userId: string, since: string): Promise<string[]> {
    const { data, error } = await this.db.from('user_activity_days')
      .select('activity_date')
      .eq('user_id', userId)
      .gte('activity_date', since)
      .order('activity_date', { ascending: true });
    if (error) throw toServerError(error.message);
    return (data ?? []).map((row) => row.activity_date as string);
  }

  async updateStreakTimezone(userId: string, timeZone: string): Promise<void> {
    const { error } = await this.db.from('profiles')
      .update({ streak_timezone: timeZone })
      .eq('id', userId);
    if (error) throw toServerError(error.message);
  }

  async countRewardedMinigameSessionsSince(userId: string, since: Date, game: string): Promise<number> {
    const { count, error } = await this.db
      .from('minigame_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('game', game)
      .gt('xp_awarded', 0)
      .gte('created_at', since.toISOString());

    if (error) throw toServerError(error.message);
    return count ?? 0;
  }

  async insertMinigameSession(input: InsertMinigameSessionInput): Promise<void> {
    const { error } = await this.db.from('minigame_sessions').insert([input]);
    if (error) throw toServerError(error.message);
  }

  async updateProfileMetrics(userId: string, input: UpdateProfileMetricsInput): Promise<ProfileRecord> {
    const updatePayload: UpdateProfileMetricsInput = {
      weight: input.weight,
      height: input.height,
    };

    if (input.goal) updatePayload.goal = input.goal;
    if (input.target_calories !== undefined) updatePayload.target_calories = input.target_calories;
    if (input.age !== undefined) updatePayload.age = input.age;
    if (input.gender) updatePayload.gender = input.gender;

    const { data, error } = await this.db
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as ProfileRecord;
  }

  async updateSocialProfile(userId: string, input: UpdateSocialProfileInput): Promise<ProfileRecord> {
    const { data, error } = await this.db
      .from('profiles')
      .update(input)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as ProfileRecord;
  }

  async findProfileByUsername(username: string): Promise<ProfileRecord | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return data as ProfileRecord | null;
  }

  async searchProfiles(query: string, excludeUserId: string): Promise<ProfileRecord[]> {
    const select = 'id,name,username,bio,xp,is_public,created_at';
    // % y _ son comodines de LIKE: sin escapar, buscar "%" listaria todos los
    // perfiles publicos y "_" haria de comodin de un caracter.
    const pattern = `%${escapeLikePattern(query)}%`;
    const [byUsername, byName] = await Promise.all([
      this.db.from('profiles').select(select).ilike('username', pattern).neq('id', excludeUserId).eq('is_public', true).limit(20),
      this.db.from('profiles').select(select).ilike('name', pattern).neq('id', excludeUserId).eq('is_public', true).limit(20),
    ]);

    if (byUsername.error) throw toServerError(byUsername.error.message);
    if (byName.error) throw toServerError(byName.error.message);

    const unique = new Map<string, ProfileRecord>();
    [...(byUsername.data ?? []), ...(byName.data ?? [])].forEach((profile) => {
      unique.set(profile.id, profile as ProfileRecord);
    });
    return Array.from(unique.values()).slice(0, 20);
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('profile_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error) throw toServerError(error.message);
    return (data ?? []).map((row) => String(row.following_id));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('profile_follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return Boolean(data);
  }

  async followProfile(followerId: string, followingId: string): Promise<void> {
    const { error } = await this.db
      .from('profile_follows')
      .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id' });

    if (error) throw toServerError(error.message);
  }

  async unfollowProfile(followerId: string, followingId: string): Promise<void> {
    const { error } = await this.db
      .from('profile_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw toServerError(error.message);
  }

  async getFollowCounts(profileId: string): Promise<{ followers: number; following: number }> {
    const [followersResult, followingResult] = await Promise.all([
      this.db.from('profile_follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
      this.db.from('profile_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
    ]);

    if (followersResult.error) throw toServerError(followersResult.error.message);
    if (followingResult.error) throw toServerError(followingResult.error.message);
    return { followers: followersResult.count ?? 0, following: followingResult.count ?? 0 };
  }

  async getWorkoutCount(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from('workout_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw toServerError(error.message);
    return count ?? 0;
  }

  async getRanks(): Promise<RankRecord[]> {
    const { data, error } = await this.db
      .from('ranks')
      .select('*')
      .order('min_xp', { ascending: true });

    if (error) throw toServerError(error.message);
    return (data ?? []) as RankRecord[];
  }

  async getLeaderboard(): Promise<ProfileRecord[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .order('xp', { ascending: false })
      .limit(50);

    if (error) throw toServerError(error.message);
    return (data ?? []) as ProfileRecord[];
  }

  async getExerciseHistory(userId: string): Promise<ExerciseHistoryLog[]> {
    const { data, error } = await this.db
      .from('workout_logs')
      .select(`
        id,
        exercise_logs!inner (
          exercise_id,
          weight,
          reps
        )
      `)
      .eq('user_id', userId)
      .in('exercise_logs.kind', ['normal', 'failure']);

    if (error) throw toServerError(error.message);

    return ((data ?? []) as { exercise_logs?: ExerciseHistoryLog[] }[]).flatMap((workout) =>
      Array.isArray(workout.exercise_logs) ? workout.exercise_logs : [],
    );
  }

  async getFoodLogs(userId: string, date: string): Promise<FoodLogRecord[]> {
    const { data, error } = await this.db
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) throw toServerError(error.message);
    return (data ?? []) as FoodLogRecord[];
  }

  async insertFoodLog(input: InsertFoodLogInput): Promise<FoodLogRecord> {
    const { data, error } = await this.db
      .from('food_logs')
      .insert([input])
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as FoodLogRecord;
  }

  async deleteFoodLogForUser(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('food_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw toServerError(error.message);
    return Array.isArray(data) && data.length > 0;
  }

  async getWaterLogs(userId: string, date: string): Promise<WaterLogRecord[]> {
    const { data, error } = await this.db
      .from('water_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .order('created_at', { ascending: true });

    if (error) throw toServerError(error.message);
    return (data ?? []) as WaterLogRecord[];
  }

  async insertWaterLog(userId: string, date: string, amountMl: number): Promise<WaterLogRecord> {
    const { data, error } = await this.db
      .from('water_logs')
      .insert([{ user_id: userId, log_date: date, amount_ml: amountMl }])
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as WaterLogRecord;
  }

  async deleteWaterLogForUser(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('water_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw toServerError(error.message);
    return Array.isArray(data) && data.length > 0;
  }

  async insertFoodScanAnalysis(input: InsertFoodScanAnalysisInput): Promise<FoodScanAnalysisRecord> {
    const { data, error } = await this.db
      .from('food_scan_analyses')
      .upsert([input], { onConflict: 'image_path' })
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as FoodScanAnalysisRecord;
  }

  async getFoodScanAnalysisForUser(id: string, userId: string): Promise<FoodScanAnalysisRecord | null> {
    const { data, error } = await this.db
      .from('food_scan_analyses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw toServerError(error.message);
    return data as FoodScanAnalysisRecord | null;
  }

  async searchApprovedFoodSubmissions(query: string): Promise<FoodSubmissionRecord[]> {
    const select = '*';
    if (!query.trim()) {
      const { data, error } = await this.db.from('food_submissions').select(select)
        .eq('status', 'approved').order('reviewed_at', { ascending: false }).limit(30);
      if (error) throw toServerError(error.message);
      return (data ?? []) as FoodSubmissionRecord[];
    }

    const pattern = `%${escapeLikePattern(query.trim())}%`;
    const [byName, byBrand] = await Promise.all([
      this.db.from('food_submissions').select(select).eq('status', 'approved').ilike('food_name', pattern).limit(20),
      this.db.from('food_submissions').select(select).eq('status', 'approved').ilike('brand_name', pattern).limit(20),
    ]);
    if (byName.error) throw toServerError(byName.error.message);
    if (byBrand.error) throw toServerError(byBrand.error.message);
    const unique = new Map<string, FoodSubmissionRecord>();
    [...(byName.data ?? []), ...(byBrand.data ?? [])].forEach((row) => unique.set(row.id, row as FoodSubmissionRecord));
    return [...unique.values()].slice(0, 20);
  }

  async getApprovedFoodSubmission(id: string): Promise<FoodSubmissionRecord | null> {
    const { data, error } = await this.db.from('food_submissions').select('*')
      .eq('id', id).eq('status', 'approved').maybeSingle();
    if (error) throw toServerError(error.message);
    return data as FoodSubmissionRecord | null;
  }

  async insertFoodSubmission(input: InsertFoodSubmissionInput): Promise<FoodSubmissionRecord> {
    const { data, error } = await this.db.from('food_submissions').insert([input]).select().single();
    if (error) throw toServerError(error.message);
    return data as FoodSubmissionRecord;
  }

  async getFoodSubmissionsForUser(userId: string): Promise<FoodSubmissionRecord[]> {
    const { data, error } = await this.db.from('food_submissions').select('*')
      .eq('submitted_by', userId).order('created_at', { ascending: false }).limit(50);
    if (error) throw toServerError(error.message);
    return (data ?? []) as FoodSubmissionRecord[];
  }

  async getFoodSubmissionsByStatus(status: FoodSubmissionStatus): Promise<FoodSubmissionRecord[]> {
    const { data, error } = await this.db.from('food_submissions').select('*')
      .eq('status', status).order('created_at', { ascending: true }).limit(100);
    if (error) throw toServerError(error.message);
    return (data ?? []) as FoodSubmissionRecord[];
  }

  async reviewFoodSubmission(
    id: string,
    reviewerId: string,
    status: Extract<FoodSubmissionStatus, 'approved' | 'rejected'>,
    reviewNote: string | null,
  ): Promise<FoodSubmissionRecord | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.db.from('food_submissions').update({
      status,
      review_note: reviewNote,
      reviewed_by: reviewerId,
      reviewed_at: now,
      updated_at: now,
    }).eq('id', id).eq('status', 'pending').select().maybeSingle();
    if (error) throw toServerError(error.message);
    return data as FoodSubmissionRecord | null;
  }
}
