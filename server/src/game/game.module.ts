import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { GameGateway } from './game.gateway';
import { GameBotController } from './game-bot.controller';
import { GameHistoryController } from './game-history.controller';
import { GameService } from './game.service';
import { MatchEntity } from './infrastructure/persistence/relational/entities/match.entity';
import { MoveEntity } from './infrastructure/persistence/relational/entities/move.entity';
import { RoomEntity } from './infrastructure/persistence/relational/entities/room.entity';

@Module({
  imports: [
    AuthModule,
    ChatModule,
    LeaderboardModule,
    TypeOrmModule.forFeature([RoomEntity, MatchEntity, MoveEntity]),
  ],
  controllers: [GameHistoryController, GameBotController],
  providers: [GameGateway, GameService],
  exports: [GameService],
})
export class GameModule {}
