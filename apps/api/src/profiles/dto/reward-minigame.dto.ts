import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RewardMinigameDto {
  @ApiProperty({ example: 37, description: 'Flexiones detectadas en la partida.' })
  @IsInt()
  @Min(1)
  @Max(100)
  reps!: number;

  @ApiPropertyOptional({ example: 120, description: 'Duracion de la partida en segundos. Opcional para APK anteriores.' })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(3600)
  durationSeconds?: number;

  @ApiPropertyOptional({ enum: ['completed', 'retired'], description: 'Resultado de la partida. Opcional para APK anteriores.' })
  @IsOptional()
  @IsIn(['completed', 'retired'])
  outcome?: 'completed' | 'retired';
}
