import { apiClient } from './axios';
import type { RankTierId } from '@/utils/rankTier';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  elo: number;
  rankTierId: RankTierId;
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const response = await apiClient.get<LeaderboardEntry[]>('/leaderboard', {
    params: { limit },
  });
  return response.data;
}
