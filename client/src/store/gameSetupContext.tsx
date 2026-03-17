/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_GAME_CONFIG } from '@/constants/gameDefaults'
import { CONFIG_LIMITS } from '@/constants/gameDefaults'
import type {
  BoardConfig,
  GameConfig,
  GameMode,
  GameSetupState,
  PlacedShip,
  ShipDefinition,
} from '@/types/game'

// -------------------------------------------------------
// Context value shape
// -------------------------------------------------------
interface GameSetupContextValue {
  state: GameSetupState

  // Mode
  setMode: (mode: GameMode) => void

  // Board config
  setBoardConfig: (boardConfig: BoardConfig) => void
  setTurnTimerSeconds: (turnTimerSeconds: number) => void

  // Ship definitions (the fleet template)
  setShipDefinitions: (ships: ShipDefinition[]) => void
  addShipDefinition: (ship: ShipDefinition) => void
  updateShipDefinition: (id: string, patch: Partial<Omit<ShipDefinition, 'id'>>) => void
  removeShipDefinition: (id: string) => void

  // Placements (ships placed on the board)
  setPlacements: (placements: PlacedShip[]) => void
  addPlacement: (ship: PlacedShip) => void
  removePlacement: (definitionId: string, instanceIndex: number) => void
  clearPlacements: () => void

  // Config shorthand
  setConfig: (config: GameConfig) => void
  resetConfig: () => void

  // Ready state
  setReady: (ready: boolean) => void

  // Reset everything
  resetAll: () => void
}

// -------------------------------------------------------
// Default / initial state
// -------------------------------------------------------
function makeInitialState(mode: GameMode = 'bot'): GameSetupState {
  return {
    mode,
    config: DEFAULT_GAME_CONFIG,
    placements: [],
    isReady: false,
  }
}

// -------------------------------------------------------
// Context + Provider
// -------------------------------------------------------
const GameSetupContext = createContext<GameSetupContextValue | null>(null)

export function GameSetupProvider({
  children,
  initialMode = 'bot',
}: {
  children: ReactNode
  initialMode?: GameMode
}) {
  const [state, setState] = useState<GameSetupState>(() =>
    makeInitialState(initialMode),
  )

  const setMode = useCallback((mode: GameMode) => {
    setState((s) => ({ ...s, mode }))
  }, [])

  const setBoardConfig = useCallback((boardConfig: BoardConfig) => {
    const { minRows, maxRows, minCols, maxCols } = CONFIG_LIMITS.board
    const clamped: BoardConfig = {
      rows: Math.min(maxRows, Math.max(minRows, boardConfig.rows)),
      cols: Math.min(maxCols, Math.max(minCols, boardConfig.cols)),
    }
    setState((s) => ({
      ...s,
      config: { ...s.config, boardConfig: clamped },
      placements: [],  // reset placements when board changes
    }))
  }, [])

  const setTurnTimerSeconds = useCallback((turnTimerSeconds: number) => {
    setState((s) => ({
      ...s,
      config: { ...s.config, turnTimerSeconds },
    }))
  }, [])

  const setShipDefinitions = useCallback((ships: ShipDefinition[]) => {
    setState((s) => ({
      ...s,
      config: { ...s.config, ships },
      placements: [],
    }))
  }, [])

  const addShipDefinition = useCallback((ship: ShipDefinition) => {
    setState((s) => {
      if (s.config.ships.length >= CONFIG_LIMITS.ship.maxShipTypes) return s
      if (s.config.ships.some((d) => d.id === ship.id)) return s
      return {
        ...s,
        config: { ...s.config, ships: [...s.config.ships, ship] },
      }
    })
  }, [])

  const updateShipDefinition = useCallback(
    (id: string, patch: Partial<Omit<ShipDefinition, 'id'>>) => {
      setState((s) => ({
        ...s,
        config: {
          ...s.config,
          ships: s.config.ships.map((d) =>
            d.id === id ? { ...d, ...patch } : d,
          ),
        },
        placements: s.placements.filter((p) => p.definitionId !== id),
      }))
    },
    [],
  )

  const removeShipDefinition = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      config: {
        ...s.config,
        ships: s.config.ships.filter((d) => d.id !== id),
      },
      placements: s.placements.filter((p) => p.definitionId !== id),
    }))
  }, [])

  const setPlacements = useCallback((placements: PlacedShip[]) => {
    setState((s) => ({ ...s, placements }))
  }, [])

  const addPlacement = useCallback((ship: PlacedShip) => {
    setState((s) => ({
      ...s,
      placements: [...s.placements, ship],
    }))
  }, [])

  const removePlacement = useCallback(
    (definitionId: string, instanceIndex: number) => {
      setState((s) => ({
        ...s,
        placements: s.placements.filter(
          (p) =>
            !(p.definitionId === definitionId && p.instanceIndex === instanceIndex),
        ),
      }))
    },
    [],
  )

  const clearPlacements = useCallback(() => {
    setState((s) => ({ ...s, placements: [], isReady: false }))
  }, [])

  const setConfig = useCallback((config: GameConfig) => {
    setState((s) => ({ ...s, config, placements: [], isReady: false }))
  }, [])

  const resetConfig = useCallback(() => {
    setState((s) => ({
      ...s,
      config: DEFAULT_GAME_CONFIG,
      placements: [],
      isReady: false,
    }))
  }, [])

  const setReady = useCallback((ready: boolean) => {
    setState((s) => ({ ...s, isReady: ready }))
  }, [])

  const resetAll = useCallback(() => {
    setState((s) => makeInitialState(s.mode))
  }, [])

  return (
    <GameSetupContext.Provider
      value={{
        state,
        setMode,
        setBoardConfig,
        setTurnTimerSeconds,
        setShipDefinitions,
        addShipDefinition,
        updateShipDefinition,
        removeShipDefinition,
        setPlacements,
        addPlacement,
        removePlacement,
        clearPlacements,
        setConfig,
        resetConfig,
        setReady,
        resetAll,
      }}
    >
      {children}
    </GameSetupContext.Provider>
  )
}

// -------------------------------------------------------
// Hook
// -------------------------------------------------------
export function useGameSetup(): GameSetupContextValue {
  const ctx = useContext(GameSetupContext)
  if (!ctx) throw new Error('useGameSetup must be used within GameSetupProvider')
  return ctx
}
