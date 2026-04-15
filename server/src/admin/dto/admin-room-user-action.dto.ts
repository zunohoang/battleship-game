import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminRoomUserActionDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
