import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FoodSearchResult } from '../domain/domain.types';
import { normalizeLabel } from '../domain/normalize';

interface FdcNutrient { nutrientId?: number; value?: number; unitName?: string; nutrient?: { id?: number }; amount?: number }
interface FdcFood { fdcId?: number; description?: string; dataType?: string; foodNutrients?: FdcNutrient[] }

const SEARCH_ALIASES: Record<string, string> = {
  palta: 'avocado raw', aguacate: 'avocado raw', quinoa: 'quinoa cooked',
  papa: 'potatoes boiled', patata: 'potatoes boiled', camote: 'sweet potato cooked',
  lentejas: 'lentils cooked', garbanzos: 'chickpeas cooked', porotos: 'beans cooked',
  frijoles: 'beans cooked', brocoli: 'broccoli cooked', salmon: 'salmon cooked',
  pescado: 'fish cooked', carne: 'beef cooked', cerdo: 'pork cooked',
  yogur: 'yogurt plain', yogurt: 'yogurt plain', queso: 'cheese',
  fideos: 'pasta cooked', pasta: 'pasta cooked', naranja: 'orange raw',
  frutilla: 'strawberries raw', fresa: 'strawberries raw',
};

const nutrient = (food: FdcFood, id: number): number | null => {
  const entry = food.foodNutrients?.find((item) => (item.nutrientId ?? item.nutrient?.id) === id);
  const value = entry?.value ?? entry?.amount;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
};

const toFood = (food: FdcFood): FoodSearchResult | null => {
  if (!Number.isSafeInteger(food.fdcId) || !food.description || food.dataType === 'Branded') return null;
  const calories = nutrient(food, 1008) ?? nutrient(food, 2047) ?? nutrient(food, 2048);
  const protein = nutrient(food, 1003);
  const carbs = nutrient(food, 1005);
  const fat = nutrient(food, 1004);
  if (calories === null || protein === null || carbs === null || fat === null) return null;
  const serving = {
    amount: 100, unit: 'g' as const, calories, protein, carbs, fat,
    description: 'Por 100 g · USDA FoodData Central', isPer100: true,
  };
  return {
    food_id: `fdc-${food.fdcId}`, food_name: food.description.trim(),
    food_description: `${serving.description} - ${Math.round(calories)} kcal | Grasas: ${fat}g | Carbs: ${carbs}g | Proteina: ${protein}g`,
    serving, source: 'usda',
  };
};

@Injectable()
export class FoodDataCentralService {
  private readonly cache = new Map<string, { expires: number; foods: FoodSearchResult[] }>();
  private readonly foodCache = new Map<string, { expires: number; food: FoodSearchResult }>();

  constructor(private readonly config: ConfigService) {}

  async search(query: string): Promise<FoodSearchResult[]> {
    const key = this.config.get<string>('USDA_FDC_API_KEY');
    const term = query.trim().slice(0, 100);
    const searchTerm = SEARCH_ALIASES[normalizeLabel(term)] ?? term;
    if (!key || term.length < 2) return [];
    const cached = this.cache.get(term.toLowerCase());
    if (cached && cached.expires > Date.now()) return cached.foods;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
      url.searchParams.set('api_key', key);
      const response = await fetch(url, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm, pageSize: 20, dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'] }),
      });
      if (!response.ok) return [];
      const payload = await response.json() as { foods?: FdcFood[] };
      const foods = (payload.foods ?? []).map(toFood).filter((food): food is FoodSearchResult => food !== null);
      this.cache.set(term.toLowerCase(), { foods, expires: Date.now() + 10 * 60_000 });
      for (const food of foods) this.foodCache.set(food.food_id, { food, expires: Date.now() + 10 * 60_000 });
      if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value!);
      while (this.foodCache.size > 1000) this.foodCache.delete(this.foodCache.keys().next().value!);
      return foods;
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  async getFood(id: string): Promise<FoodSearchResult | null> {
    const key = this.config.get<string>('USDA_FDC_API_KEY');
    if (!key || !/^fdc-\d+$/.test(id)) return null;
    const cached = this.foodCache.get(id);
    if (cached && cached.expires > Date.now()) return cached.food;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const url = new URL(`https://api.nal.usda.gov/fdc/v1/food/${id.slice(4)}`);
      url.searchParams.set('api_key', key);
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      const food = toFood(await response.json() as FdcFood);
      if (food) {
        this.foodCache.set(id, { food, expires: Date.now() + 10 * 60_000 });
        if (this.foodCache.size > 1000) this.foodCache.delete(this.foodCache.keys().next().value!);
      }
      return food;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
