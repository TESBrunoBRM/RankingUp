import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type {
  FoodLogRecord,
  MealType,
  ProfileRecord,
  RankRecord,
  WeekDay,
  WorkoutExerciseRecord,
  WorkoutRecord,
  ExerciseHistoryLog,
} from '../domain/domain.types';
import { SupabaseService } from './supabase.service';

interface WorkoutLogRecord {
  id: string;
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
}

const toServerError = (message: string): InternalServerErrorException =>
  new InternalServerErrorException(message);

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

  async updateProfileXp(userId: string, totalXp: number): Promise<void> {
    const { error } = await this.db
      .from('profiles')
      .update({ xp: totalXp })
      .eq('id', userId);

    if (error) throw toServerError(error.message);
  }

  async updateProfileMetrics(userId: string, input: UpdateProfileMetricsInput): Promise<ProfileRecord> {
    const updatePayload: UpdateProfileMetricsInput = {
      weight: input.weight,
      height: input.height,
    };

    if (input.goal) updatePayload.goal = input.goal;
    if (input.target_calories !== undefined) updatePayload.target_calories = input.target_calories;

    const { data, error } = await this.db
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw toServerError(error.message);
    return data as ProfileRecord;
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
        exercise_logs (
          exercise_id,
          weight,
          reps
        )
      `)
      .eq('user_id', userId);

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
}
