# Class Diagram - Game Setup va Placement

## Pham vi
Mo ta cac lop du lieu va quan he trong giai doan setup va dat tau.

## Mermaid
```mermaid
classDiagram
  class GameSetupContext {
    +mode
    +config
    +placements
    +isReady
    +setBoardConfig()
    +setShips()
    +setPlacements()
  }
  class GameConfig {
    +boardConfig: BoardConfig
    +ships: ShipDefinition[]
  }
  class BoardConfig {
    +rows: number
    +cols: number
  }
  class ShipDefinition {
    +id: string
    +name: string
    +size: number
    +count: number
  }
  class PlacedShip {
    +definitionId: string
    +instanceIndex: number
    +x: number
    +y: number
    +orientation: horizontal|vertical
  }
  class PlacementUtils {
    +canPlace()
    +buildOccupiedMap()
    +randomPlacement()
  }

  GameSetupContext --> GameConfig
  GameConfig --> BoardConfig
  GameConfig --> ShipDefinition
  GameSetupContext --> PlacedShip
  GameSetupContext --> PlacementUtils
```

## Nguon ma lien quan
- client/src/store/gameSetupContext.tsx
- client/src/hooks/useGameSetupEngine.ts
- client/src/utils/placementUtils.ts
- client/src/types/game.ts
- client/src/constants/gameDefaults.ts
