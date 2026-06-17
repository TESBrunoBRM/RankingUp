import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class GetNutritionLogsDto {
  @ApiProperty({ example: '2026-06-04' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}
