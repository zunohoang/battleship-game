import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const MODERATION_STATUS = ['pending', 'resolved', 'dismissed'] as const;
const MODERATION_TYPES = ['post', 'comment'] as const;
const SEVERITY_LEVELS = ['low', 'medium', 'high'] as const;

export class AdminModerationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(MODERATION_STATUS)
  status?: (typeof MODERATION_STATUS)[number];

  @IsOptional()
  @IsIn(MODERATION_TYPES)
  targetType?: (typeof MODERATION_TYPES)[number];

  @IsOptional()
  @IsIn(SEVERITY_LEVELS)
  severity?: (typeof SEVERITY_LEVELS)[number];
}
