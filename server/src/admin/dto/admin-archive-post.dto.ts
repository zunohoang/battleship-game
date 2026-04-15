import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminArchivePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
