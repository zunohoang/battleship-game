import { Transform } from 'class-transformer';
import {
  Allow,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  SIGNATURE_REGEX,
  USERNAME_REGEX,
  trimString,
} from '../../auth/validation/auth-validation';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'USERNAME_INVALID_FORMAT' })
  @IsNotEmpty({ message: 'USERNAME_REQUIRED' })
  @MaxLength(20, { message: 'USERNAME_TOO_LONG' })
  @Matches(USERNAME_REGEX, { message: 'USERNAME_INVALID_FORMAT' })
  username?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'SIGNATURE_INVALID_FORMAT' })
  @MaxLength(200, { message: 'SIGNATURE_TOO_LONG' })
  @Matches(SIGNATURE_REGEX, { message: 'SIGNATURE_INVALID_FORMAT' })
  signature?: string;

  @IsOptional()
  @IsString({ message: 'PASSWORD_TOO_SHORT' })
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(72, { message: 'PASSWORD_TOO_LONG' })
  password?: string;

  @IsOptional()
  @Allow()
  avatar?: unknown;
}
