import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ example: 'America/Santiago' })
  @IsString()
  @MaxLength(80)
  timeZone!: string;
}
