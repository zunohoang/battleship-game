import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChatHistoryDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'ROOM_ID_INVALID' })
  roomId?: string;
}

export class SendChatMessageDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'ROOM_ID_INVALID' })
  roomId?: string;

  @IsString({ message: 'CHAT_MESSAGE_REQUIRED' })
  @MinLength(1, { message: 'CHAT_MESSAGE_REQUIRED' })
  @MaxLength(280, { message: 'CHAT_MESSAGE_TOO_LONG' })
  content: string;
}
