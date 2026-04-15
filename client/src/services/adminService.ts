import { apiClient } from './axios';
import type {
  AdminAuditLog,
  AdminMatch,
  AdminOverview,
  AdminRoom,
  AdminUser,
  ModerationItem,
  PagedResponse,
} from '@/types/admin';

const now = Date.now();
const toIso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

const MOCK_OVERVIEW: AdminOverview = {
  onlineUsers: 124,
  activeRooms: 31,
  inGameMatches: 18,
  newPosts24h: 42,
  pendingReports: 8,
  activeBans: 5,
  alerts: [
    { id: 'a1', level: 'high', message: '3 rooms stuck in setup over 10m' },
    { id: 'a2', level: 'medium', message: 'Comment report spike in the last hour' },
    { id: 'a3', level: 'low', message: '2 matches waiting for ELO settlement' },
  ],
};

const MOCK_ROOMS: AdminRoom[] = [
  {
    roomId: 'r1',
    roomCode: 'AB12CD34',
    status: 'in_game',
    visibility: 'public',
    currentMatchId: 'm-1001',
    ownerUsername: 'captainA',
    guestUsername: 'captainB',
    phase: 'in_progress',
    createdAt: toIso(2 * 60 * 60 * 1000),
    updatedAt: toIso(30 * 60 * 1000),
  },
  {
    roomId: 'r2',
    roomCode: 'EF56GH78',
    status: 'setup',
    visibility: 'private',
    currentMatchId: 'm-1002',
    ownerUsername: 'userX',
    guestUsername: null,
    phase: 'setup',
    createdAt: toIso(90 * 60 * 1000),
    updatedAt: toIso(20 * 60 * 1000),
  },
];

const MOCK_MATCHES: AdminMatch[] = [
  {
    matchId: 'm-1001',
    roomId: 'r1',
    roomCode: 'AB12CD34',
    status: 'in_progress',
    player1Id: 'u-100',
    player1Username: 'captainA',
    player2Id: 'u-101',
    player2Username: 'captainB',
    winnerId: null,
    winnerUsername: null,
    endedByAdmin: false,
    adminInterventionType: null,
    adminInterventionReason: null,
    updatedAt: toIso(30 * 60 * 1000),
  },
];

const MOCK_QUEUE: ModerationItem[] = [
  {
    reportId: 'm1',
    targetType: 'post',
    targetId: 'post-1',
    authorId: 'user-10',
    contentPreview: 'Suspicious promotional post with repeated links.',
    authorUsername: 'spamPilot',
    reportCount: 9,
    status: 'pending',
    severity: 'high',
    createdAt: toIso(70 * 60 * 1000),
  },
  {
    reportId: 'm2',
    targetType: 'comment',
    targetId: 'comment-1',
    authorId: 'user-11',
    contentPreview: 'Toxic language in match discussion thread.',
    authorUsername: 'rageSea',
    reportCount: 4,
    status: 'pending',
    severity: 'medium',
    createdAt: toIso(45 * 60 * 1000),
  },
];

const MOCK_USERS: AdminUser[] = [
  {
    userId: 'u1',
    username: 'captainA',
    email: 'captainA@example.com',
    role: 'USER',
    elo: 1032,
    banStatus: 'not_banned',
    banReason: null,
    bannedAt: null,
  },
  {
    userId: 'u2',
    username: 'toxicSea',
    email: 'toxicSea@example.com',
    role: 'USER',
    elo: 810,
    banStatus: 'temporary',
    banReason: 'Abusive chat in spectator room',
    bannedAt: toIso(5 * 60 * 60 * 1000),
  },
];

const MOCK_AUDIT: AdminAuditLog[] = [
  {
    id: 'l1',
    actor: 'admin01',
    action: 'BAN_USER_TEMP',
    target: 'user:toxicSea',
    createdAt: toIso(4 * 60 * 60 * 1000),
    metadata: 'days=7',
  },
  {
    id: 'l2',
    actor: 'mod02',
    action: 'ARCHIVE_FORUM_POST',
    target: 'post:12ab',
    createdAt: toIso(3 * 60 * 60 * 1000),
    metadata: 'reason=spam links',
  },
];

export async function getAdminOverview(): Promise<AdminOverview> {
  try {
    const response = await apiClient.get<AdminOverview>('/admin/dashboard/overview');
    return response.data;
  } catch {
    return MOCK_OVERVIEW;
  }
}

export async function listAdminRooms(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  visibility?: string;
}): Promise<PagedResponse<AdminRoom>> {
  try {
    const response = await apiClient.get<PagedResponse<AdminRoom>>(
      '/admin/game/rooms',
      { params },
    );
    return response.data;
  } catch {
    return { page: 1, limit: 10, total: MOCK_ROOMS.length, data: MOCK_ROOMS };
  }
}

export async function listAdminMatches(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
}): Promise<PagedResponse<AdminMatch>> {
  try {
    const response = await apiClient.get<PagedResponse<AdminMatch>>(
      '/admin/game/matches',
      { params },
    );
    return response.data;
  } catch {
    return { page: 1, limit: 10, total: MOCK_MATCHES.length, data: MOCK_MATCHES };
  }
}

export async function listModerationQueue(params?: {
  page?: number;
  limit?: number;
  q?: string;
  targetType?: string;
  status?: string;
  severity?: string;
}): Promise<PagedResponse<ModerationItem>> {
  try {
    const response = await apiClient.get<PagedResponse<ModerationItem>>(
      '/admin/forum/moderation/queue',
      { params },
    );
    return response.data;
  } catch {
    return { page: 1, limit: 10, total: MOCK_QUEUE.length, data: MOCK_QUEUE };
  }
}

export async function listAdminUsers(params?: {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  banStatus?: string;
}): Promise<PagedResponse<AdminUser>> {
  try {
    const response = await apiClient.get<PagedResponse<AdminUser>>('/admin/users', {
      params,
    });
    return response.data;
  } catch {
    return { page: 1, limit: 10, total: MOCK_USERS.length, data: MOCK_USERS };
  }
}

export async function listAuditLogs(params?: {
  page?: number;
  limit?: number;
  q?: string;
  action?: string;
}): Promise<PagedResponse<AdminAuditLog>> {
  try {
    const response = await apiClient.get<PagedResponse<AdminAuditLog>>(
      '/admin/audit-logs',
      { params },
    );
    return response.data;
  } catch {
    return { page: 1, limit: 10, total: MOCK_AUDIT.length, data: MOCK_AUDIT };
  }
}

export async function forceCloseRoom(
  roomId: string,
  reason: string,
): Promise<void> {
  await apiClient.post(`/admin/game/rooms/${roomId}/force-close`, { reason });
}

export async function forceFinishMatch(
  matchId: string,
  payload: { result: 'draw' | 'win'; winnerId?: string; reason: string },
): Promise<void> {
  await apiClient.post(`/admin/game/matches/${matchId}/force-finish`, payload);
}

export async function archiveForumPostByAdmin(
  postId: string,
  reason: string,
): Promise<void> {
  await apiClient.post(`/admin/forum/posts/${postId}/archive`, { reason });
}

export async function deleteForumCommentByAdmin(commentId: string): Promise<void> {
  await apiClient.delete(`/admin/forum/comments/${commentId}`);
}

export type BanUserPayload =
  | { type: 'temporary'; days: number; reason?: string }
  | { type: 'permanent'; reason?: string };

export async function banUserByAdmin(
  userId: string,
  payload: BanUserPayload,
): Promise<void> {
  await apiClient.post(`/admin/users/${userId}/ban`, payload);
}

export async function unbanUserByAdmin(userId: string): Promise<void> {
  await apiClient.post(`/admin/users/${userId}/unban`);
}

export async function grantModeratorRoleByAdmin(userId: string): Promise<void> {
  await apiClient.post(`/admin/users/${userId}/grant-moderator`);
}

export async function revokeModeratorRoleByAdmin(userId: string): Promise<void> {
  await apiClient.post(`/admin/users/${userId}/revoke-moderator`);
}

export async function forceWinInRoom(
  roomId: string,
  userId: string,
  reason: string,
): Promise<void> {
  await apiClient.post(`/admin/game/rooms/${roomId}/force-win`, {
    userId,
    reason,
  });
}

export async function kickUserFromRoom(
  roomId: string,
  userId: string,
  reason: string,
): Promise<void> {
  await apiClient.post(`/admin/game/rooms/${roomId}/kick-user`, {
    userId,
    reason,
  });
}

export async function banUserInRoom(
  roomId: string,
  userId: string,
  payload: BanUserPayload,
): Promise<void> {
  await apiClient.post(`/admin/game/rooms/${roomId}/ban-user`, {
    userId,
    ...payload,
  });
}
