import type { FoodSearchResult } from '../types';
import { rankingUpApiClient } from './rankingUpApiClient';

export const fatSecretService = {
  async searchFoods(query: string): Promise<FoodSearchResult[]> {
    return rankingUpApiClient.searchFoods(query);
  },

  async findFoodIdByBarcode(barcode: string): Promise<string | null> {
    const result = await rankingUpApiClient.findFoodIdByBarcode(barcode);
    return result.food_id;
  },

  async getFood(foodId: string): Promise<FoodSearchResult | null> {
    try {
      return await rankingUpApiClient.getFood(foodId);
    } catch {
      return null;
    }
  },
};
