import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { MatchEntity } from './infrastructure/persistence/relational/entities/match.entity';
import { MoveEntity } from './infrastructure/persistence/relational/entities/move.entity';
import { RoomEntity } from './infrastructure/persistence/relational/entities/room.entity';

@Module({
  imports: [
    AuthModule,
    ChatModule,
    TypeOrmModule.forFeature([RoomEntity, MatchEntity, MoveEntity]),
  ],
  providers: [GameGateway, GameService],
  exports: [GameService],
})
export class GameModule {}
