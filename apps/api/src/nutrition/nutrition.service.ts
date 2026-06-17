import { Injectable, NotFoundException } from '@nestjs/common';
import { calculateFoodLog, calculateNutritionSummary } from '../domain/nutrition.calculator';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { FoodsService } from '../foods/foods.service';
import { CreateFoodLogDto } from './dto/create-food-log.dto';

@Injectable()
export class NutritionService {
  constructor(
    private readonly repository: SupabaseRepository,
    private readonly foodsService: FoodsService,
  ) {}

  async getDailySummary(userId: string, date: string) {
    const [profile, logs] = await Promise.all([
      this.repository.getProfile(userId),
      this.repository.getFoodLogs(userId, date),
    ]);
    const summary = calculateNutritionSummary(logs, profile);

    return {
      date,
      logs,
      ...summary,
    };
  }

  async createFoodLog(userId: string, dto: CreateFoodLogDto) {
    const food = this.foodsService.getFood(dto.foodId);
    if (!food) {
      throw new NotFoundException('Alimento no encontrado.');
    }

    const calculated = calculateFoodLog(food, dto.amount, dto.unit);
    const log = await this.repository.insertFoodLog({
      user_id: userId,
      date: dto.date,
      meal_type: dto.mealType,
      food_name: calculated.foodName,
      fatsecret_food_id: calculated.foodId,
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fat: calculated.fat,
      servings: calculated.servings,
    });

    return { log };
  }

  async deleteFoodLog(userId: string, id: string) {
    const deleted = await this.repository.deleteFoodLogForUser(id, userId);
    if (!deleted) {
      throw new NotFoundException('Registro no encontrado para este usuario.');
    }
    return { deleted: true };
  }
}
