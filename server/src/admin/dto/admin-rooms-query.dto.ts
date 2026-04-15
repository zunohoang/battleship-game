import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const ROOM_STATUSES = ['waiting', 'setup', 'in_game', 'finished', 'closed'] as const;
const ROOM_VISIBILITY = ['public', 'private'] as const;

export class AdminRoomsQueryDto {
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
  @IsIn(ROOM_STATUSES)
  status?: (typeof ROOM_STATUSES)[number];

  @IsOptional()
  @IsIn(ROOM_VISIBILITY)
  visibility?: (typeof ROOM_VISIBILITY)[number];
}
