import { envStatus } from '../config/env';

export interface AnalyzedFood {
  food_name: string;
  serving_description: string;
  serving_size: number;
  isDemoFallback: boolean;
}

export const aiAnalyzerService = {
  async analyzeImageB64(_base64Image: string): Promise<AnalyzedFood[]> {
    if (!envStatus.hasDemoFallbacks) {
      return [];
    }

    return [
      {
        food_name: 'Manzana',
        serving_description: 'Porción estimada de demo',
        serving_size: 100,
        isDemoFallback: true,
      },
    ];
  },
};
