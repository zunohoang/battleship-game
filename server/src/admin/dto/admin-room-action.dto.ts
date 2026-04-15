import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminRoomActionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
