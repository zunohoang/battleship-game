export type RoomVisibility = 'public' | 'private';

export type RoomStatus =
  | 'waiting'
  | 'setup'
  | 'in_game'
  | 'finished'
  | 'closed';

export type MatchStatus = 'setup' | 'in_progress' | 'finished';
export type RoomListAccessState = 'setting_up' | 'ready' | 'playing';
export type RoomListOccupancy = '1/2' | '2/2';
export type RoomListActionKind = 'open' | 'join' | 'watch';

export type Orientation = 'horizontal' | 'vertical';

export interface BoardConfig {
  rows: number;
  cols: number;
}

export interface ShipDefinition {
  id: string;
  name: string;
  size: number;
  count: number;
}

export interface PlacedShip {
  definitionId: string;
  instanceIndex: number;
  x: number;
  y: number;
  orientation: Orientation;
}

export interface ShotRecord {
  x: number;
  y: number;
  isHit: boolean;
  at: string;
  by: string;
  sequence: number;
  clientMoveId: string;
  source?: 'manual' | 'timeout_auto';
}

export interface RoomListPhase1Config {
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  turnTimerSeconds: number;
}

export interface RoomSnapshot {
  roomId: string;
  roomCode: string;
  visibility: RoomVisibility;
  status: RoomStatus;
  ownerId: string;
  guestId: string | null;
  currentMatchId: string | null;
  ownerReady: boolean;
  guestReady: boolean;
  closeReasonCode?: string | null;
  closeReasonMessage?: string | null;
  closeReasonTargetUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomListSummary {
  roomId: string;
  roomCode: string;
  visibility: RoomVisibility;
  status: RoomStatus;
  accessState: RoomListAccessState;
  occupancy: RoomListOccupancy;
  actionKind: RoomListActionKind;
  phase1Config: RoomListPhase1Config | null;
}

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

export interface MatchSnapshot {
  id: string;
  roomId: string;
  status: MatchStatus;
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  turnTimerSeconds: number;
  player1Id: string;
  player2Id: string;
  player1Placements: PlacedShip[] | null;
  player2Placements: PlacedShip[] | null;
  player1Shots: ShotRecord[];
  player2Shots: ShotRecord[];
  turnPlayerId: string | null;
  winnerId: string | null;
  setupDeadlineAt: string | null;
  turnDeadlineAt: string | null;
  version: number;
  rematchVotes: Record<string, boolean>;
  endedByAdmin?: boolean;
  adminInterventionType?: 'force_win' | 'kick' | 'ban' | null;
  adminInterventionReason?: string | null;
  updatedAt: string;
}
