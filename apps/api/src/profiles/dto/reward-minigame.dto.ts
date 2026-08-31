import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsInt } from 'class-validator';

export class RewardMinigameDto {
  @ApiProperty({ example: 100, description: 'Repeticiones requeridas para completar la campaña.' })
  @IsInt()
  @Equals(100)
  reps!: number;
}
