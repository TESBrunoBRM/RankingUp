import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { trim } from "../admin/admin.dto";

export class CreateContentReportDto {
  @ApiProperty() @IsUUID() postId!: string;
  @ApiProperty({
    enum: [
      "spam",
      "harassment",
      "inappropriate",
      "violence",
      "misinformation",
      "other",
    ],
  })
  @IsIn([
    "spam",
    "harassment",
    "inappropriate",
    "violence",
    "misinformation",
    "other",
  ])
  reason!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(2000)
  details?: string;
}

export class CreateBugReportDto {
  @ApiProperty()
  @IsString()
  @trim()
  @MinLength(3)
  @MaxLength(120)
  title!: string;
  @ApiProperty()
  @IsString()
  @trim()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;
  @ApiProperty()
  @IsString()
  @trim()
  @MinLength(3)
  @MaxLength(4000)
  steps!: string;
  @ApiProperty()
  @IsString()
  @trim()
  @MinLength(1)
  @MaxLength(64)
  appVersion!: string;
  @ApiProperty()
  @IsString()
  @trim()
  @MinLength(1)
  @MaxLength(80)
  platform!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  screenshotPath?: string;
}
