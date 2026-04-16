export type GameMode = 'bot' | 'online' | 'botvbot';
export type OnlineSetupFlow = 'phase1' | 'placement';

export type Orientation = 'horizontal' | 'vertical';

// --- Ship definition (template, not a placed ship) ---
export interface ShipDefinition {
  id: string;
  name: string; // display name
  size: number; // number of cells it occupies
  count: number; // how many of this type are on the board
}

// --- A ship that has been placed on the board ---
export interface PlacedShip {
  definitionId: string;
  instanceIndex: number; // which copy (0-based) when count > 1
  x: number; // column (0-based)
  y: number; // row (0-based)
  orientation: Orientation;
}

// --- Board / map configuration ---
export interface BoardConfig {
  rows: number;
  cols: number;
}

// --- Full game configuration chosen by the player ---
export interface GameConfig {
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  turnTimerSeconds: number;
}

// --- Everything stored during the setup phase ---
export interface GameSetupState {
  mode: GameMode;
  config: GameConfig;
  placements: PlacedShip[];
  isReady: boolean;
}

// --- Battle / game-play types ---
export type AiDifficulty = 'random' | 'probability' | 'llm';
export type BotPlacementStrategy = 'random' | 'strategic';
export type BotPlacementMode = 'auto' | 'manual';

export interface BotPlayerSettings {
  difficulty: AiDifficulty;
  placementStrategy: BotPlacementStrategy;
  placementMode?: BotPlacementMode;
}

export interface BotVBotSettings {
  botA: BotPlayerSettings;
  botB: BotPlayerSettings;
}

export interface Shot {
  x: number;
  y: number;
  isHit: boolean;
}

export type GamePhase = 'playing' | 'gameover';

export type TurnOwner = 'player' | 'bot';

export type GameResult = 'player_wins' | 'bot_wins';

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

export interface RoomListPhase1Config {
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  turnTimerSeconds: number;
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

export interface MatchSnapshot {
  id: string;
  roomId: string;
  status: MatchStatus;
  boardConfig: GameConfig['boardConfig'];
  ships: GameConfig['ships'];
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

export interface RoomActionPayload {
  roomId: string;
}

export interface CreateRoomPayload {
  visibility?: RoomVisibility;
}

export interface ConfigureRoomSetupPayload {
  roomId: string;
  boardConfig: GameConfig['boardConfig'];
  ships: GameConfig['ships'];
  turnTimerSeconds: number;
}

export interface JoinRoomPayload {
  roomId?: string;
  roomCode?: string;
}

export interface SpectateRoomPayload {
  roomId: string;
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

export type MissionLogHighlight =
  | 'friendly'
  | 'enemy'
  | 'critical'
  | 'error'
  | 'miss'
  | 'info';

export interface MissionLogEntry {
  id: number;
  timestamp: string;
  message: string;
  highlight?: MissionLogHighlight;
}

export interface GamePlayLocationState {
  mode?: GameMode;
  roomId?: string;
  matchId?: string;
  config?: GameConfig;
  placements?: PlacedShip[];
  botPlacements?: PlacedShip[];
  aiDifficulty?: AiDifficulty;
  botVBotSettings?: BotVBotSettings;
}
