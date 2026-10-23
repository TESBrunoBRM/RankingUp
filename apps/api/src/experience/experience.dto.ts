import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, Equals, IsArray, IsIn } from 'class-validator';

export const EXPERIENCE_VERSION = '2026-10-23';
export const FEATURES = ['training', 'nutrition', 'community'] as const;

export class SaveExperienceDto {
  @ApiProperty({ enum: FEATURES, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsIn(FEATURES, { each: true })
  features!: Array<typeof FEATURES[number]>;

  @ApiProperty({ example: EXPERIENCE_VERSION })
  @Equals(EXPERIENCE_VERSION, { message: 'Actualiza la aplicación para revisar la guía vigente.' })
  safetyVersion!: string;

  @ApiProperty({ example: true })
  @Equals(true)
  safetyAcknowledged!: boolean;

  @ApiProperty({ example: true })
  @Equals(true)
  dataAccuracyAcknowledged!: boolean;

  @ApiProperty({ example: true })
  @Equals(true)
  guideCompleted!: boolean;
}
