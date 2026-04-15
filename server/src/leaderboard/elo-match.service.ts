import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import { MatchEntity } from '../game/infrastructure/persistence/relational/entities/match.entity';
import { computeNewRatingsAfterWin } from './elo.util';

@Injectable()
export class EloMatchService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Applies one-time ELO update for a finished PvP match (idempotent via `eloSettled`).
   */
  async settleMatchElo(matchId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const matchRepo = manager.getRepository(MatchEntity);
      const userRepo = manager.getRepository(UserEntity);

      const match = await matchRepo
        .createQueryBuilder('m')
        .where('m.id = :id', { id: matchId })
        .setLock('pessimistic_write')
        .getOne();

      if (
        !match ||
        match.status !== 'finished' ||
        !match.winnerId ||
        match.eloSettled ||
        match.endedByAdmin
      ) {
        return;
      }

      const winnerId = match.winnerId;
      const loserId =
        winnerId === match.player1Id ? match.player2Id : match.player1Id;

      const winner = await userRepo.findOne({ where: { id: winnerId } });
      const loser = await userRepo.findOne({ where: { id: loserId } });

      if (!winner || !loser) {
        return;
      }

      const { newWinner, newLoser } = computeNewRatingsAfterWin(
        winner.elo,
        loser.elo,
      );

      winner.elo = newWinner;
      loser.elo = newLoser;
      match.eloSettled = true;

      await userRepo.save([winner, loser]);
      await matchRepo.save(match);
    });
  }
}
