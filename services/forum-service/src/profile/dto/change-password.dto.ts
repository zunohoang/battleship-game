import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'CURRENT_PASSWORD_INVALID' })
  @IsNotEmpty({ message: 'CURRENT_PASSWORD_REQUIRED' })
  currentPassword!: string;

  @IsString({ message: 'PASSWORD_INVAID_FORMAT' })
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(72, { message: 'PASSWORD_TOO_LONG' })
  newPassword!: string;
}
