import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import type { FoodAnalysisMode, FoodSubmissionStatus, NutritionUnit } from '../../domain/domain.types';

const NUTRITION_UNITS: NutritionUnit[] = ['g', 'ml', 'oz', 'unidad', 'porcion'];

export class FoodImageUploadDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(5242880)
  sizeBytes!: number;
}

export class AnalyzeFoodImageDto {
  @IsString()
  @MaxLength(300)
  imagePath!: string;

  @ApiProperty({ enum: ['meal', 'nutrition_label'] })
  @IsEnum(['meal', 'nutrition_label'])
  mode!: FoodAnalysisMode;
}

export class CreateFoodSubmissionDto {
  @IsString() @MaxLength(120) foodName!: string;
  @IsOptional() @IsString() @MaxLength(120) brandName?: string;
  @IsOptional() @IsString() @MaxLength(64) barcode?: string;
  @IsNumber() @Min(0.01) @Max(100000) servingAmount!: number;
  @IsEnum(NUTRITION_UNITS) servingUnit!: NutritionUnit;
  @IsNumber() @Min(0) @Max(100000) calories!: number;
  @IsNumber() @Min(0) @Max(10000) protein!: number;
  @IsNumber() @Min(0) @Max(10000) carbs!: number;
  @IsNumber() @Min(0) @Max(10000) fat!: number;
  @IsString() @MaxLength(300) imagePath!: string;
  @IsIn(['nutrition_label', 'ai_estimate']) sourceMode!: 'nutrition_label' | 'ai_estimate';
  @IsOptional() @IsUUID() scanAnalysisId?: string;
  @IsOptional() @IsString() @MaxLength(1000) submitterNotes?: string;
}

export class ReviewFoodSubmissionDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: Extract<FoodSubmissionStatus, 'approved' | 'rejected'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}

export class ListFoodSubmissionsDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status: FoodSubmissionStatus = 'pending';
}
