import { Injectable } from '@nestjs/common';
import { getFoodById, searchFoods } from '../domain/foods.catalog';

@Injectable()
export class FoodsService {
  search(query: string) {
    return searchFoods(query);
  }

  getFood(foodId: string) {
    return getFoodById(foodId);
  }
}
