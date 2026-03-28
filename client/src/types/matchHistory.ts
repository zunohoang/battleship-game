export interface OnlineMatchShotStats {
  shotsFired: number;
  hits: number;
  misses: number;
  accuracy: number;
}

export interface OnlineMatchHistoryItem {
  matchId: string;
  roomId: string;
  finishedAt: string;
  outcome: 'win' | 'loss';
  opponentId: string;
  opponentUsername: string | null;
  yourStats: OnlineMatchShotStats;
  opponentStats: OnlineMatchShotStats;
}
