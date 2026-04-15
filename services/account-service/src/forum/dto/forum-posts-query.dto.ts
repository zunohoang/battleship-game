import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, MaxLength, Min } from 'class-validator';
import {
  FORUM_ALLOWED_SORTS,
  FORUM_SEARCH_QUERY_MAX_LENGTH,
  trimString,
} from '../validation/forum-validation';

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
  sort?: 'newest' | 'top' | 'comments' = 'newest';

  @IsOptional()
  @Transform(({ value }) => {
    const s = trimString(value);
    return s.length > 0 ? s : undefined;
  })
  @MaxLength(FORUM_SEARCH_QUERY_MAX_LENGTH, {
    message: 'FORUM_SEARCH_TOO_LONG',
  })
  q?: string;
}
