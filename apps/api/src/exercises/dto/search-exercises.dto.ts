import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SearchExercisesDto {
  @ApiPropertyOptional({ description: 'Texto libre. Acepta espanol ("pecho", "mancuernas") o ingles.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  query?: string;

  @ApiPropertyOptional({ description: 'Zona del cuerpo en ingles, tal como la devuelve /v1/exercises/filters.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bodyPart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  equipment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  target?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  pageSize?: number;
}
