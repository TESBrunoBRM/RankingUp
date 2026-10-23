import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export const trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  );

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @trim()
  search = "";
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}

export class FoodCorrectionsDto {
  @IsOptional()
  @IsString()
  @trim()
  @MinLength(2)
  @MaxLength(120)
  food_name?: string;
  @IsOptional() @IsString() @trim() @MaxLength(120) brand_name?: string;
  @IsOptional() @IsString() @trim() @MaxLength(64) barcode?: string;
  @IsOptional() @IsNumber() @Min(0.01) @Max(100000) serving_amount?: number;
  @IsOptional()
  @IsIn(["g", "ml", "oz", "unidad", "porcion"])
  serving_unit?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) calories?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10000) protein?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10000) carbs?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10000) fat?: number;
}

export class ReviewAdminFoodDto {
  @ApiProperty({ enum: ["approved", "rejected"] })
  @IsIn(["approved", "rejected"])
  status!: "approved" | "rejected";
  @ApiProperty()
  @IsString()
  @trim()
  @MinLength(2)
  @MaxLength(1000)
  reviewNote!: string;
  @ApiPropertyOptional({ type: FoodCorrectionsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FoodCorrectionsDto)
  corrections?: FoodCorrectionsDto;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(4000)
  internalNotes?: string;
  @ApiProperty() @IsISO8601() expectedUpdatedAt!: string;
}

export class ReviewContentReportDto {
  @ApiProperty({ enum: ["pending", "in_review", "resolved", "dismissed"] })
  @IsIn(["pending", "in_review", "resolved", "dismissed"])
  status!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(2000)
  publicResponse?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(4000)
  internalNotes?: string;
  @ApiProperty() @IsISO8601() expectedUpdatedAt!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsBoolean()
  hidePost?: boolean;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  expectedPostUpdatedAt?: string | null;
}

export class ReviewBugDto {
  @ApiProperty({ enum: ["open", "in_progress", "resolved", "closed"] })
  @IsIn(["open", "in_progress", "resolved", "closed"])
  status!: string;
  @ApiProperty({ enum: ["low", "normal", "high", "critical"] })
  @IsIn(["low", "normal", "high", "critical"])
  priority!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(2000)
  publicResponse?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(4000)
  internalNotes?: string;
  @ApiProperty() @IsISO8601() expectedUpdatedAt!: string;
}

export class ModeratePostDto {
  @ApiProperty()
  @Transform(({ obj, key }) => obj[key])
  @IsBoolean()
  hidden!: boolean;
  @ApiProperty()
  @IsString()
  @trim()
  @MinLength(2)
  @MaxLength(2000)
  reason!: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string | null;
}
