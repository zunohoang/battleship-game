import { apiClient } from './axios';
import type { OnlineMatchHistoryItem } from '@/types/matchHistory';

export async function fetchOnlineMatchHistory(
  limit = 20,
): Promise<OnlineMatchHistoryItem[]> {
  const response = await apiClient.get<OnlineMatchHistoryItem[]>(
    '/game/matches/history',
    { params: { limit } },
  );
  return response.data;
}
