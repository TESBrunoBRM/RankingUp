import type { FoodLog, MealType, NutritionSummaryResponse, NutritionUnit } from '../types';
import { rankingUpApiClient } from './rankingUpApiClient';

export const nutritionLogService = {
  async getDailySummary(date: string): Promise<NutritionSummaryResponse> {
    return rankingUpApiClient.getNutritionLogs(date);
  },

  async getDailyLogs(_userId: string, date: string): Promise<FoodLog[]> {
    const summary = await rankingUpApiClient.getNutritionLogs(date);
    return summary.logs;
  },

  async addFoodLog(log: {
    date: string;
    meal_type: MealType;
    fatsecret_food_id: string;
    servings: number;
    unit?: NutritionUnit;
  }): Promise<FoodLog | null> {
    const result = await rankingUpApiClient.addFoodLog({
      date: log.date,
      mealType: log.meal_type,
      foodId: log.fatsecret_food_id,
      amount: log.servings,
      unit: log.unit ?? 'porcion',
    });
    return result.log;
  },

  async deleteFoodLog(id: string, _userId: string): Promise<boolean> {
    const result = await rankingUpApiClient.deleteFoodLog(id);
    return result.deleted;
  },
};
