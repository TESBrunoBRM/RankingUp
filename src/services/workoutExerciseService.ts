import { supabase } from '../lib/supabase';
import { WorkoutExercise } from '../types';

export const workoutExerciseService = {
  async getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
    const { data, error } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data as WorkoutExercise[];
  },

  async addExerciseToWorkout(exercise: Omit<WorkoutExercise, 'id'>): Promise<WorkoutExercise> {
    const { data, error } = await supabase
      .from('workout_exercises')
      .insert([exercise])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as WorkoutExercise;
  },

  async removeExerciseFromWorkout(id: string): Promise<void> {
    const { error } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
};
