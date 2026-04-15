export type AdminOverview = {
  onlineUsers: number;
  activeRooms: number;
  inGameMatches: number;
  newPosts24h: number;
  pendingReports: number;
  activeBans: number;
  alerts: Array<{
    id: string;
    level: 'low' | 'medium' | 'high';
    message: string;
  }>;
};

export type PagedResponse<T> = {
  page: number;
  limit: number;
  total: number;
  data: T[];
};

export type AdminRoom = {
  roomId: string;
  roomCode: string;
  status: 'waiting' | 'setup' | 'in_game' | 'finished' | 'closed';
  visibility: 'public' | 'private';
  currentMatchId?: string | null;
  ownerUsername: string;
  guestUsername: string | null;
  phase: 'setup' | 'in_progress' | 'finished' | '-';
  createdAt: string;
  updatedAt: string;
};

export type AdminMatch = {
  matchId: string;
  roomId: string;
  roomCode: string;
  status: 'setup' | 'in_progress' | 'finished';
  player1Id: string;
  player1Username: string;
  player2Id: string;
  player2Username: string;
  winnerId: string | null;
  winnerUsername: string | null;
  endedByAdmin: boolean;
  adminInterventionType: 'force_win' | 'kick' | 'ban' | null;
  adminInterventionReason: string | null;
  updatedAt: string;
};

export type ModerationItem = {
  reportId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  authorId: string;
  contentPreview: string;
  authorUsername: string;
  reportCount: number;
  status: 'pending' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
};

export type AdminUser = {
  userId: string;
  username: string;
  email: string;
  role: 'USER' | 'MOD' | 'ADMIN';
  elo: number;
  banStatus: 'not_banned' | 'temporary' | 'permanent';
  banReason: string | null;
  bannedAt: string | null;
};

export type AdminAuditLog = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
  metadata?: string;
};
