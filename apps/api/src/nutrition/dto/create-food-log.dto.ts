import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Matches, Min } from 'class-validator';
import type { MealType, NutritionUnit } from '../../domain/domain.types';

const MEAL_TYPES: MealType[] = ['desayuno', 'almuerzo', 'cena', 'snack'];
const NUTRITION_UNITS: NutritionUnit[] = ['g', 'ml', 'oz', 'unidad', 'porcion'];

export class CreateFoodLogDto {
  @ApiProperty({ example: '2026-06-04' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ enum: MEAL_TYPES })
  @IsEnum(MEAL_TYPES)
  mealType!: MealType;

  @ApiProperty({ example: 'demo-apple' })
  @IsString()
  foodId!: string;

  @ApiProperty({ example: 100, minimum: 0.1 })
  @IsNumber()
  @Min(0.1)
  amount!: number;

  @ApiProperty({ enum: NUTRITION_UNITS })
  @IsEnum(NUTRITION_UNITS)
  unit!: NutritionUnit;
}
