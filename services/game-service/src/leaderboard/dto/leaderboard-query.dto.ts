import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class LeaderboardQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'PAGINATION_INVALID' })
  @Min(1, { message: 'PAGINATION_INVALID' })
  @Max(100, { message: 'PAGINATION_INVALID' })
  limit?: number = 50;
}
