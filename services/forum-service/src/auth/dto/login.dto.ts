import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EMAIL_REGEX, trimString } from '../validation/auth-validation';

export class LoginDto {
  @Transform(({ value }) => trimString(value))
  @Matches(EMAIL_REGEX, { message: 'INVALID_EMAIL' })
  email: string;

  @IsString({ message: 'PASSWORD_TOO_SHORT' })
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(72, { message: 'PASSWORD_TOO_LONG' })
  password: string;
}
