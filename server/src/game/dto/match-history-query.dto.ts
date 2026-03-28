import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MatchHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'PAGINATION_INVALID' })
  @Min(1, { message: 'PAGINATION_INVALID' })
  @Max(50, { message: 'PAGINATION_INVALID' })
  limit?: number = 20;
}
