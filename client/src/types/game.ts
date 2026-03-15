export type GameMode = 'bot' | 'online' | 'botvbot'

export type Orientation = 'horizontal' | 'vertical'

// --- Ship definition (template, not a placed ship) ---
export interface ShipDefinition {
  id: string
  name: string       // display name
  size: number       // number of cells it occupies
  count: number      // how many of this type are on the board
}

// --- A ship that has been placed on the board ---
export interface PlacedShip {
  definitionId: string
  instanceIndex: number  // which copy (0-based) when count > 1
  x: number              // column (0-based)
  y: number              // row (0-based)
  orientation: Orientation
}

// --- Board / map configuration ---
export interface BoardConfig {
  rows: number
  cols: number
}

// --- Full game configuration chosen by the player ---
export interface GameConfig {
  boardConfig: BoardConfig
  ships: ShipDefinition[]
}

// --- Everything stored during the setup phase ---
export interface GameSetupState {
  mode: GameMode
  config: GameConfig
  placements: PlacedShip[]
  isReady: boolean
}

// --- Battle / game-play types ---
export type AiDifficulty = 'random' | 'learning' | 'probability'

export interface Shot {
  x: number
  y: number
  isHit: boolean
}

export type GamePhase = 'playing' | 'gameover'

export type TurnOwner = 'player' | 'bot'

export type GameResult = 'player_wins' | 'bot_wins'
