import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchEntity } from '../game/infrastructure/persistence/relational/entities/match.entity';
import { RoomEntity } from '../game/infrastructure/persistence/relational/entities/room.entity';
import { ChatService } from './chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoomEntity, MatchEntity])],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
