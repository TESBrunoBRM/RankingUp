import type { FoodSearchResult } from '../types';
import { rankingUpApiClient } from './rankingUpApiClient';

export const fatSecretService = {
  async searchFoods(query: string): Promise<FoodSearchResult[]> {
    return rankingUpApiClient.searchFoods(query);
  },

  async getFood(foodId: string): Promise<FoodSearchResult | null> {
    try {
      return await rankingUpApiClient.getFood(foodId);
    } catch {
      return null;
    }
  },
};
