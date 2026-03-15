import type { GameConfig, PlacedShip } from './game';

export type RoomVisibility = 'public' | 'private';
export type RoomStatus = 'waiting' | 'setup' | 'in_game' | 'finished' | 'closed';
export type MatchStatus = 'setup' | 'in_progress' | 'finished';

export interface ShotRecord {
  x: number;
  y: number;
  isHit: boolean;
  at: string;
  by: string;
  sequence: number;
  clientMoveId: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface MatchSnapshot {
  id: string;
  roomId: string;
  status: MatchStatus;
  boardConfig: GameConfig['boardConfig'];
  ships: GameConfig['ships'];
  player1Id: string;
  player2Id: string;
  player1Placements: PlacedShip[] | null;
  player2Placements: PlacedShip[] | null;
  player1Shots: ShotRecord[];
  player2Shots: ShotRecord[];
  turnPlayerId: string | null;
  winnerId: string | null;
  setupDeadlineAt: string | null;
  version: number;
  rematchVotes: Record<string, boolean>;
  updatedAt: string;
}

export interface RoomActionPayload {
  roomId: string;
}

export interface CreateRoomPayload {
  visibility?: RoomVisibility;
  boardConfig: GameConfig['boardConfig'];
  ships: GameConfig['ships'];
}

export interface JoinRoomPayload {
  roomCode?: string;
}

export interface RoomReadyPayload {
  roomId: string;
  placements: PlacedShip[];
}

export interface MatchMovePayload {
  matchId: string;
  x: number;
  y: number;
  clientMoveId?: string;
}
