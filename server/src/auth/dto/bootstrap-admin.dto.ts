import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  EMAIL_REGEX,
  USERNAME_REGEX,
  trimString,
} from '../validation/auth-validation';

export class BootstrapAdminDto {
  @Transform(({ value }) => trimString(value))
  @Matches(EMAIL_REGEX, { message: 'INVALID_EMAIL' })
  email: string;

  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'USERNAME_INVALID_FORMAT' })
  @IsNotEmpty({ message: 'USERNAME_REQUIRED' })
  @MaxLength(20, { message: 'USERNAME_TOO_LONG' })
  @Matches(USERNAME_REGEX, { message: 'USERNAME_INVALID_FORMAT' })
  username: string;

  @IsString({ message: 'PASSWORD_TOO_SHORT' })
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(72, { message: 'PASSWORD_TOO_LONG' })
  password: string;
}
