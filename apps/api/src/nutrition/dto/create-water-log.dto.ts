import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Matches, Max, Min } from 'class-validator';

export class CreateWaterLogDto {
  @ApiProperty({ example: '2026-09-21' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ example: 250, minimum: 50, maximum: 2000, default: 250 })
  @IsInt()
  @Min(50)
  @Max(2000)
  amountMl = 250;
}
