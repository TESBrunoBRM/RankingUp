import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, Max, Min } from 'class-validator';
import type { GoalType } from '../../domain/domain.types';
import type { GenderType } from '../../domain/profile.calculator';

const GOAL_TYPES: GoalType[] = ['bajar', 'mantener', 'subir'];
const GENDER_TYPES: GenderType[] = ['hombre', 'mujer'];

export class CompleteOnboardingDto {
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

  @ApiProperty({ example: 25, minimum: 10, maximum: 100 })
  @IsInt()
  @Min(10)
  @Max(100)
  age!: number;

  @ApiProperty({ enum: GENDER_TYPES })
  @IsEnum(GENDER_TYPES)
  gender!: GenderType;

  @ApiProperty({ enum: GOAL_TYPES })
  @IsEnum(GOAL_TYPES)
  goal!: GoalType;
}
