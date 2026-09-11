import { getSupabaseClient } from '../lib/supabase';
import { GoalType, Profile, RankInfo, WorkoutLogInput } from '../types';
import { getErrorMessage } from '../utils/errors';
import { rankingUpApiClient } from './rankingUpApiClient';

interface ExerciseHistoryLog {
  exercise_id: string;
  weight: number;
  reps: number;
}

export const workoutLogService = {
  // Guarda el registro del entrenamiento e incrementa los puntos de experiencia del usuario
  async logWorkoutSession(
    _userId: string, 
    workoutId: string, 
    logs: WorkoutLogInput[]
  ): Promise<{ success: boolean, gainedXp: number }> {
    try {
      const result = await rankingUpApiClient.logWorkoutSession(workoutId, logs);
      return { success: true, gainedXp: result.gainedXp };
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Falló el guardado del entrenamiento.');
      throw new Error(message);
    }
  },

  async getUserProfile(userId: string): Promise<Profile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
       console.warn('Error al cargar perfil:', error.message);
       return null;
    }
    return data as Profile;
  },

  async updateProfileMetrics(
    _userId: string, 
    weight: number, 
    height: number, 
    goal?: GoalType, 
    target_calories?: number
  ): Promise<void> {
    await rankingUpApiClient.updateProfileMetrics({
      weight,
      height,
      goal,
      targetCalories: target_calories,
    });
  },

  async getGlobalLeaderboard(): Promise<Profile[]> {
    const ranking = await rankingUpApiClient.getRanking();
    return ranking.leaderboard;
  },

  async getAllRanks(): Promise<RankInfo[]> {
    const ranking = await rankingUpApiClient.getRanking();
    return ranking.ranks;
  },

  async getUserExerciseHistory(_userId: string): Promise<ExerciseHistoryLog[]> {
    const ranking = await rankingUpApiClient.getRanking();
    return ranking.history;
  }
};
