import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import type { GoalType } from '../../domain/domain.types';

const GOAL_TYPES: GoalType[] = ['bajar', 'mantener', 'subir'];

export class UpdateProfileMetricsDto {
  @ApiProperty({ example: 75, minimum: 30, maximum: 300 })
  @IsNumber()
  @Min(30)
  @Max(300)
  weight!: number;

  @ApiProperty({ example: 175, minimum: 100, maximum: 250 })
  @IsNumber()
  @Min(100)
  @Max(250)
  height!: number;

  @ApiPropertyOptional({ enum: GOAL_TYPES })
  @IsOptional()
  @IsEnum(GOAL_TYPES)
  goal?: GoalType;

  @ApiPropertyOptional({ example: 2500, minimum: 800, maximum: 7000 })
  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(7000)
  targetCalories?: number;
}
