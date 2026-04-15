import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import { getRankTierId } from './rank-tiers';

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  elo: number;
  rankTierId: ReturnType<typeof getRankTierId>;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async listLeaderboard(limit: number): Promise<LeaderboardEntryDto[]> {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.userRepo.find({
      order: { elo: 'DESC', username: 'ASC' },
      take,
      select: ['id', 'username', 'avatar', 'elo'],
    });

    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      username: row.username,
      avatar: row.avatar,
      elo: row.elo,
      rankTierId: getRankTierId(row.elo),
    }));
  }
}
