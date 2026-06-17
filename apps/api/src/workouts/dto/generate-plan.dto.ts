import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsString, Max, Min } from 'class-validator';

export class GeneratePlanDto {
  @ApiProperty({ example: 'Gimnasio Comercial' })
  @IsString()
  equipment!: string;

  @ApiProperty({ example: ['Pecho', 'Espalda'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  primaryMuscles!: string[];

  @ApiProperty({ example: ['Hombros'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  secondaryMuscles!: string[];

  @ApiProperty({ example: 60, minimum: 10, maximum: 180 })
  @IsInt()
  @Min(10)
  @Max(180)
  duration!: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  days!: number;
}
