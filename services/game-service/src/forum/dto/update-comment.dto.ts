import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  FORUM_COMMENT_CONTENT_MAX_LENGTH,
  trimString,
} from '../validation/forum-validation';

export class UpdateCommentDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'FORUM_COMMENT_REQUIRED' })
  @MinLength(1, { message: 'FORUM_COMMENT_REQUIRED' })
  @MaxLength(FORUM_COMMENT_CONTENT_MAX_LENGTH, {
    message: 'FORUM_COMMENT_TOO_LONG',
  })
  content?: string;
}
