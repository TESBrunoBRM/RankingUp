import type { FoodSearchResult, NutritionServing } from './domain.types';
import { normalizeLabel } from './normalize';

const serving = (
  amount: number,
  unit: NutritionServing['unit'],
  calories: number,
  fat: number,
  carbs: number,
  protein: number,
  description: string,
  isPer100 = amount === 100,
): NutritionServing => ({
  amount,
  unit,
  calories,
  protein,
  carbs,
  fat,
  description,
  isPer100,
});

const food = (
  food_id: string,
  food_name: string,
  itemServing: NutritionServing,
  brand_name?: string,
): FoodSearchResult => ({
  food_id,
  food_name,
  brand_name,
  food_description: `${itemServing.description} - ${itemServing.calories} kcal | Grasas: ${itemServing.fat}g | Carbs: ${itemServing.carbs}g | Proteina: ${itemServing.protein}g`,
  serving: itemServing,
  source: 'local',
});

export const FOOD_CATALOG: FoodSearchResult[] = [
  food('demo-chicken-breast', 'Pechuga de pollo', serving(100, 'g', 165, 3.6, 0, 31, 'Por 100 g')),
  food('demo-white-rice', 'Arroz blanco cocido', serving(100, 'g', 130, 0.3, 28, 2.7, 'Por 100 g')),
  food('demo-egg', 'Huevo entero grande', serving(1, 'unidad', 72, 4.8, 0.4, 6.3, 'Por 1 unidad', false)),
  food('demo-oats', 'Avena en hojuelas', serving(100, 'g', 389, 6.9, 66, 16.9, 'Por 100 g')),
  food('demo-tuna', 'Atun en agua', serving(100, 'g', 90, 1, 0, 20, 'Por 100 g')),
  food('demo-apple', 'Manzana', serving(100, 'g', 52, 0.2, 14, 0.3, 'Por 100 g')),
  food('demo-banana', 'Platano', serving(100, 'g', 89, 0.3, 23, 1.1, 'Por 100 g')),
  food('demo-pear', 'Pera', serving(100, 'g', 57, 0.1, 15, 0.4, 'Por 100 g')),
  food('demo-skim-milk', 'Leche descremada', serving(100, 'ml', 34, 0.1, 5, 3.4, 'Por 100 ml')),
  food('demo-whole-bread', 'Pan integral', serving(100, 'g', 247, 3.4, 41, 13, 'Por 100 g')),
];

export const searchFoods = (query: string): FoodSearchResult[] => {
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return FOOD_CATALOG;

  const matches = FOOD_CATALOG.filter((item) => normalizeLabel(item.food_name).includes(normalizedQuery));
  return matches.length > 0 ? matches : FOOD_CATALOG.slice(0, 6);
};

export const getFoodById = (foodId: string): FoodSearchResult | null =>
  FOOD_CATALOG.find((item) => item.food_id === foodId) ?? null;
