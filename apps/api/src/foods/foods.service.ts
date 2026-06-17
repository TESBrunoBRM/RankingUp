import { Injectable } from '@nestjs/common';
import { findFoodByBarcode, getFoodById, searchFoods } from '../domain/foods.catalog';

@Injectable()
export class FoodsService {
  search(query: string) {
    return searchFoods(query);
  }

  getFood(foodId: string) {
    return getFoodById(foodId);
  }

  findByBarcode(barcode: string) {
    const food = findFoodByBarcode(barcode);
    return { food_id: food?.food_id ?? null };
  }
}
