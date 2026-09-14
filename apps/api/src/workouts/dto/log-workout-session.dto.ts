import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Una sesion muy larga ronda las 40 series; 60 deja margen de sobra. */
export const MAX_SETS_PER_SESSION = 60;

export class LogWorkoutSetDto {
  @ApiProperty({ example: 'Press de Banca' })
  @IsString()
  @MaxLength(120)
  exerciseId!: string;

  @ApiProperty({ example: 80, minimum: 0, maximum: 1000 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  weight!: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  reps!: number;

  @ApiPropertyOptional({ enum: ['normal', 'warmup', 'drop', 'failure'] })
  @IsOptional()
  @IsIn(['normal', 'warmup', 'drop', 'failure'])
  kind?: 'normal' | 'warmup' | 'drop' | 'failure';

  @ApiPropertyOptional({ minimum: 1, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  setIndex?: number;
}

export class LogWorkoutSessionDto {
  @ApiProperty({ example: 'workout-id' })
  @IsString()
  workoutId!: string;

  @ApiProperty({ type: [LogWorkoutSetDto], maxItems: MAX_SETS_PER_SESSION })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SETS_PER_SESSION)
  @ValidateNested({ each: true })
  @Type(() => LogWorkoutSetDto)
  sets!: LogWorkoutSetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 86400 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  durationSeconds?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  clientSessionId?: string;
}
