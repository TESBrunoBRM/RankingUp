import { supabase } from '../lib/supabase';
import { FoodLog } from '../types';

export const nutritionLogService = {
  async getDailyLogs(userId: string, date: string): Promise<FoodLog[]> {
    try {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as FoodLog[];
    } catch (error) {
      console.error('Error fetching daily logs:', error);
      return [];
    }
  },

  async addFoodLog(log: Omit<FoodLog, 'id' | 'created_at'>): Promise<FoodLog | null> {
    try {
      const { data, error } = await supabase
        .from('food_logs')
        .insert([log])
        .select()
        .single();

      if (error) throw error;
      return data as FoodLog;
    } catch (error) {
      console.error('Error adding food log:', error);
      throw error;
    }
  },

  async deleteFoodLog(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting food log:', error);
      return false;
    }
  }
};
