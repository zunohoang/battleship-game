import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import {
  FORUM_POST_CONTENT_MAX_LENGTH,
  FORUM_POST_TITLE_MAX_LENGTH,
  trimString,
} from '../validation/forum-validation';

export class CreatePostDto {
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'FORUM_POST_TITLE_REQUIRED' })
  @IsNotEmpty({ message: 'FORUM_POST_TITLE_REQUIRED' })
  @MaxLength(FORUM_POST_TITLE_MAX_LENGTH, {
    message: 'FORUM_POST_TITLE_TOO_LONG',
  })
  title: string;

  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'FORUM_POST_CONTENT_REQUIRED' })
  @MinLength(1, { message: 'FORUM_POST_CONTENT_REQUIRED' })
  @MaxLength(FORUM_POST_CONTENT_MAX_LENGTH, {
    message: 'FORUM_POST_CONTENT_TOO_LONG',
  })
  content: string;
}
