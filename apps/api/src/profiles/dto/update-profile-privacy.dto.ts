import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfilePrivacyDto {
  @ApiProperty()
  // Preserve JSON booleans: implicit conversion would turn the string "false" into true.
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.isPublic)
  @IsBoolean()
  isPublic!: boolean;
}
