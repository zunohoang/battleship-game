import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import { EloMatchService } from './elo-match.service';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, EloMatchService],
  exports: [EloMatchService, LeaderboardService],
})
export class LeaderboardModule {}
