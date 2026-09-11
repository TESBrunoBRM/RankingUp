import { getSupabaseClient } from '../lib/supabase';
import { WeekDay, Workout } from '../types';

export const workoutService = {
  async getWorkouts(userId: string): Promise<Workout[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data as Workout[];
  },

  async createWorkout(workout: { name: string; description?: string; user_id: string; scheduled_day?: WeekDay | null }): Promise<Workout> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('workouts')
      .insert([workout])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Workout;
  },

  async deleteWorkout(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  },

  async getWorkoutById(id: string): Promise<Workout> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Workout;
  }
};
