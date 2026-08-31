import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { DUEL_DEFAULT_TARGET_REPS } from '../../domain/duel.rules';

export class CreateDuelDto {
  @ApiProperty({ description: 'Perfil al que se reta.' })
  @IsUUID()
  opponentId!: string;

  @ApiPropertyOptional({ default: DUEL_DEFAULT_TARGET_REPS, minimum: 5, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(500)
  targetReps?: number;
}
