import { IsNumber, IsOptional, IsString, Matches, Max, Min, MaxLength } from 'class-validator';

export class WeightHistoryQueryDto {
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  before?: string;
}

export class RecordWeightDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(30) @Max(300)
  weight!: number;

  @IsString() @MaxLength(100)
  timeZone!: string;
}

export class WeightTargetDto {
  // null explicitly clears a previously saved goal.
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(30) @Max(300)
  targetWeight!: number | null;
}
