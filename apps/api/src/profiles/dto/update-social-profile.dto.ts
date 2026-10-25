import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSocialProfileDto {
  @ApiProperty({ minLength: 2, maxLength: 40 })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ minLength: 3, maxLength: 24 })
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[a-z0-9_]+$/, { message: 'El usuario solo puede contener letras minusculas, numeros y guion bajo.' })
  username!: string;

  @ApiPropertyOptional({ maxLength: 140 })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.isPublic)
  @IsBoolean()
  isPublic?: boolean;
}
