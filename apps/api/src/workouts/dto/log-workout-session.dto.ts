import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';

export class LogWorkoutSetDto {
  @ApiProperty({ example: 'Press de Banca' })
  @IsString()
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
}

export class LogWorkoutSessionDto {
  @ApiProperty({ example: 'workout-id' })
  @IsString()
  workoutId!: string;

  @ApiProperty({ type: [LogWorkoutSetDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LogWorkoutSetDto)
  sets!: LogWorkoutSetDto[];
}
