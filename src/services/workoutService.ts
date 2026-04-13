import { supabase } from '../lib/supabase';
import { Workout } from '../types';

export const workoutService = {
  async getWorkouts(userId: string): Promise<Workout[]> {
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

  async createWorkout(workout: { name: string; description?: string; user_id: string; scheduled_day?: string | null }): Promise<Workout> {
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
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  },

  async getWorkoutById(id: string): Promise<Workout> {
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
