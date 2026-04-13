import { supabase } from '../lib/supabase';
import { WorkoutLog, ExerciseLog, Profile } from '../types';

const XP_RULES: { [key: string]: number } = {
  // English (API Ninjas)
  'chest': 15, 'lats': 15, 'middle back': 15, 'lower back': 15,
  'quadriceps': 15, 'hamstrings': 15, 'glutes': 15,
  'biceps': 10, 'triceps': 10, 'shoulders': 10, 'traps': 10, 'calves': 10, 'abdominals': 10,
  // Spanish (RankingUp Classics)
  'pecho': 15, 'pecho superior': 15, 'espalda (dorsales)': 15, 'espalda media': 15,
  'cuádriceps': 15, 'isquiosurales': 15, 'glúteos': 15,
  'bíceps': 10, 'tríceps': 10, 'hombros': 10, 'pantorrillas': 10, 'abdominales': 10,
  
  'default': 5 // if muscle not mapped 
};

export const workoutLogService = {
  // Guarda el registro del entrenamiento e incrementa los puntos de experiencia del usuario
  async logWorkoutSession(
    userId: string, 
    workoutId: string, 
    logs: { exercise_id: string, weight: number, reps: number, muscle: string }[]
  ): Promise<{ success: boolean, gainedXp: number }> {
    try {
      // 1. Insert Workout Log
      const { data: logData, error: logError } = await supabase
        .from('workout_logs')
        .insert([{ user_id: userId, workout_id: workoutId, date: new Date().toISOString() }])
        .select()
        .single();
        
      if (logError) throw logError;
      
      const workoutLogId = logData.id;

      // 2. Insert Exercise Logs
      const exerciseInserts = logs.map(l => ({
        workout_log_id: workoutLogId,
        exercise_id: l.exercise_id,
        weight: l.weight,
        reps: l.reps
      }));

      const { error: exerciseError } = await supabase
        .from('exercise_logs')
        .insert(exerciseInserts);

      if (exerciseError) throw exerciseError;

      // 3. Calculate gained XP
      let gainedXp = 0;
      for (const log of logs) {
        // Every set (log row is 1 set per exercise conceptually if we do it by set, or if they input total sets we multiply)
        // We'll treat each item in `logs` as a logged set.
        const muscle = log.muscle.toLowerCase();
        const baseXP = XP_RULES[muscle] || XP_RULES['default'];
        gainedXp += baseXP;
      }

      // 4. Give XP to Profile
      // First get current XP
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .single();

      if (profileFetchError) {
         console.warn("No se pudo obtener el profile XP (quizas falte la columna xp), asumiendo 0 y trataremos de actualizar.");
      }

      const currentXp = profileData?.xp || 0;
      const newXp = currentXp + gainedXp;

      const { error: xpError } = await supabase
        .from('profiles')
        .update({ xp: newXp })
        .eq('id', userId);

      if (xpError) throw xpError;

      return { success: true, gainedXp };
    } catch (e: any) {
      console.error('Error logging workout:', e);
      throw new Error(e.message || 'Falló el guardado del entrenamiento');
    }
  },

  async getUserProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
       console.log("Error al cargar profile:", error.message);
       return null;
    }
    return data as Profile;
  },

  async updateProfileMetrics(
    userId: string, 
    weight: number, 
    height: number, 
    goal?: string, 
    target_calories?: number
  ): Promise<void> {
    const updatePayload: any = { weight, height };
    if (goal) updatePayload.goal = goal;
    if (target_calories) updatePayload.target_calories = target_calories;

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);
    
    if (error) {
      console.log("Error actualizando métricas:", error.message);
      throw new Error(error.message);
    }
  },

  async getGlobalLeaderboard(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('xp', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error("Error cargando leaderboard:", error.message);
      return [];
    }
    return data as Profile[];
  },

  async getAllRanks(): Promise<any[]> {
    const { data, error } = await supabase
      .from('ranks')
      .select('*')
      .order('min_xp', { ascending: true });
    
    if (error) {
       console.log("Error al cargar ranks:", error.message);
       return [];
    }
    return data;
  }
};
