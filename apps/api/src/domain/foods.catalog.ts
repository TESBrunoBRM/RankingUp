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
  // Valores por 100 g de USDA FoodData Central (SR Legacy); el identificador FDC queda en el ID.
  food('curated-fdc-173424', 'Huevo cocido duro', serving(100, 'g', 155, 10.6, 1.12, 12.6, 'Por 100 g · USDA FDC 173424')),
  food('curated-fdc-171795', 'Carne molida magra cocida (90/10)', serving(100, 'g', 214, 11.1, 0, 26.6, 'Por 100 g · USDA FDC 171795')),
  food('curated-fdc-171999', 'Salmón cocido al calor seco', serving(100, 'g', 231, 13.4, 0, 25.7, 'Por 100 g · USDA FDC 171999')),
  food('curated-fdc-169967', 'Brócoli cocido sin sal', serving(100, 'g', 35, 0.41, 7.18, 2.38, 'Por 100 g · USDA FDC 169967')),
  food('curated-fdc-172421', 'Lentejas cocidas sin sal', serving(100, 'g', 116, 0.38, 20.1, 9.02, 'Por 100 g · USDA FDC 172421')),
  food('curated-fdc-173799', 'Garbanzos cocidos con sal', serving(100, 'g', 164, 2.59, 27.4, 8.86, 'Por 100 g · USDA FDC 173799')),
  food('curated-fdc-174031', 'Hamburguesa de res magra asada (90/10)', serving(100, 'g', 217, 11.8, 0, 26.1, 'Por 100 g · USDA FDC 174031')),
];

export const searchFoods = (query: string): FoodSearchResult[] => {
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return FOOD_CATALOG;

  const matches = FOOD_CATALOG.filter((item) => normalizeLabel(item.food_name).includes(normalizedQuery));
  return matches;
};

export const getFoodById = (foodId: string): FoodSearchResult | null =>
  FOOD_CATALOG.find((item) => item.food_id === foodId) ?? null;
