import type { BoardConfig, GameConfig, ShipDefinition } from '@/types/game'

// -------------------------------------------------------
// Board size presets
// -------------------------------------------------------
export const BOARD_PRESETS: { label: string; value: BoardConfig }[] = [
  { label: '8 x 8', value: { rows: 8, cols: 8 } },
  { label: '10 x 10', value: { rows: 10, cols: 10 } },
  { label: '12 x 12', value: { rows: 12, cols: 12 } },
]

export const DEFAULT_BOARD_CONFIG: BoardConfig = BOARD_PRESETS[1].value
export const TURN_TIMER_OPTIONS = [30, 45, 60, 75, 90, 100] as const
export const DEFAULT_TURN_TIMER_SECONDS = 30
export const DEFAULT_SETUP_TIMER_SECONDS = 60

// -------------------------------------------------------
// Ship definitions - classic Battleship fleet
// -------------------------------------------------------
export const DEFAULT_SHIP_DEFINITIONS: ShipDefinition[] = [
  { id: 'carrier', name: 'Carrier', size: 5, count: 1 },
  { id: 'battleship', name: 'Battleship', size: 4, count: 1 },
  { id: 'cruiser', name: 'Cruiser', size: 3, count: 1 },
  { id: 'submarine', name: 'Submarine', size: 3, count: 1 },
  { id: 'destroyer', name: 'Destroyer', size: 2, count: 1 },
]

// -------------------------------------------------------
// Constraints for custom config
// -------------------------------------------------------
export const CONFIG_LIMITS = {
  board: { minRows: 5, maxRows: 20, minCols: 5, maxCols: 20 },
  ship: { minSize: 1, maxSize: 10, minCount: 0, maxCount: 5, maxShipTypes: 8 },
} as const

// -------------------------------------------------------
// Default full game config
// -------------------------------------------------------
export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardConfig: DEFAULT_BOARD_CONFIG,
  ships: DEFAULT_SHIP_DEFINITIONS,
  turnTimerSeconds: DEFAULT_TURN_TIMER_SECONDS,
}
