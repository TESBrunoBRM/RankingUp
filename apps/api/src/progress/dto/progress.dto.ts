import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UploadUrlDto {
  @IsString() workoutLogId!: string;
  @IsIn(['image/jpeg', 'image/png', 'image/webp']) contentType!: string;
  @IsInt() @Min(1) @Max(5242880) sizeBytes!: number;
}

export class PublishProgressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) photoPath?: string;
  @ApiPropertyOptional({ enum: ['public', 'followers', 'private'] })
  @IsOptional() @IsIn(['public', 'followers', 'private']) visibility?: 'public' | 'followers' | 'private';
}
