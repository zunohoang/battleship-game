import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';

class BoardConfigDto {
  @IsInt()
  @Min(5)
  @Max(20)
  rows: number;

  @IsInt()
  @Min(5)
  @Max(20)
  cols: number;
}

class ShipDefinitionDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(2)
  @Max(5)
  size: number;

  @IsInt()
  @Min(1)
  @Max(8)
  count: number;
}

class PlacedShipDto {
  @IsString()
  definitionId: string;

  @IsInt()
  @Min(0)
  instanceIndex: number;

  @IsInt()
  @Min(0)
  x: number;

  @IsInt()
  @Min(0)
  y: number;

  @IsIn(['horizontal', 'vertical'])
  orientation: 'horizontal' | 'vertical';
}

export class CreateRoomDto {
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';
}

export class ConfigureRoomSetupDto {
  @IsUUID()
  roomId: string;

  @ValidateNested()
  @Type(() => BoardConfigDto)
  boardConfig: BoardConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipDefinitionDto)
  ships: ShipDefinitionDto[];

  @IsInt()
  @IsIn([30, 45, 60, 75, 90, 100])
  turnTimerSeconds: number;
}

export class JoinRoomDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsString()
  roomCode?: string;
}

export class RoomActionDto {
  @IsUUID()
  roomId: string;
}

export class SpectateRoomDto {
  @IsUUID()
  roomId: string;
}

export class RoomReadyDto {
  @IsUUID()
  roomId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlacedShipDto)
  placements: PlacedShipDto[];
}

export class MoveDto {
  @IsUUID()
  matchId: string;

  @IsInt()
  @Min(0)
  x: number;

  @IsInt()
  @Min(0)
  y: number;

  @IsOptional()
  @IsString()
  clientMoveId?: string;
}

export class ReconnectDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  matchId?: string;
}

export class RematchVoteDto {
  @IsBoolean()
  accept: boolean;
}

export class SpectatorSendChatDto {
  @IsUUID(undefined, { message: 'ROOM_ID_INVALID' })
  roomId: string;

  @IsString({ message: 'CHAT_MESSAGE_REQUIRED' })
  @MinLength(1, { message: 'CHAT_MESSAGE_REQUIRED' })
  @MaxLength(280, { message: 'CHAT_MESSAGE_TOO_LONG' })
  content: string;
}
