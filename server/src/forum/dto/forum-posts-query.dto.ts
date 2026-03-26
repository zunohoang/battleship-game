import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { FORUM_ALLOWED_SORTS, trimString } from '../validation/forum-validation';

export class ForumPostsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'PAGINATION_INVALID' })
  @Min(1, { message: 'PAGINATION_INVALID' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'PAGINATION_INVALID' })
  @Min(1, { message: 'PAGINATION_INVALID' })
  @Max(30, { message: 'PAGINATION_INVALID' })
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => trimString(value).toLowerCase())
  @IsIn(FORUM_ALLOWED_SORTS, { message: 'FORUM_SORT_INVALID' })
  sort?: 'newest' | 'top' = 'newest';
}
