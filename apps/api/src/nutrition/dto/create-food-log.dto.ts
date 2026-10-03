import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { MealType, NutritionUnit } from '../../domain/domain.types';

const MEAL_TYPES: MealType[] = ['desayuno', 'almuerzo', 'cena', 'snack'];
const NUTRITION_UNITS: NutritionUnit[] = ['g', 'ml', 'oz', 'unidad', 'porcion'];

export class CorrectedFoodDto {
  @IsString() @MinLength(2) @MaxLength(120) foodName!: string;
  @IsNumber() @Min(0) @Max(100000) calories!: number;
  @IsNumber() @Min(0) @Max(10000) protein!: number;
  @IsNumber() @Min(0) @Max(10000) carbs!: number;
  @IsNumber() @Min(0) @Max(10000) fat!: number;
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => CorrectedFoodDto)
  correction?: CorrectedFoodDto;
}
