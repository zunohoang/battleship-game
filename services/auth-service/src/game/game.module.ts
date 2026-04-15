import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import {
  AUTH_GRPC_CLIENT,
  AUTH_PROTO_PATH,
  GRPC_PACKAGE_AUTH,
} from '../common/grpc/grpc.constants';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { GameAuthGrpcClientService } from './game-auth-grpc-client.service';
import { GameGateway } from './game.gateway';
import { GameSocketAuthService } from './game-socket-auth.service';
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
    ClientsModule.registerAsync([
      {
        name: AUTH_GRPC_CLIENT,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: GRPC_PACKAGE_AUTH,
            protoPath: AUTH_PROTO_PATH,
            url: configService.get<string>('GRPC_AUTH_URL') ?? '127.0.0.1:50051',
            loader: {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
            },
          },
        }),
      },
    ]),
    TypeOrmModule.forFeature([RoomEntity, MatchEntity, MoveEntity]),
  ],
  controllers: [GameHistoryController, GameBotController],
  providers: [
    GameGateway,
    GameService,
    GameAuthGrpcClientService,
    GameSocketAuthService,
  ],
  exports: [GameService],
})
export class GameModule {}
