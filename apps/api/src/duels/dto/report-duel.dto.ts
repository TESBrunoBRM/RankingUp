import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ReportDuelDto {
  @ApiProperty({ description: 'Flexiones validas contadas por el detector.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  reps!: number;
}
