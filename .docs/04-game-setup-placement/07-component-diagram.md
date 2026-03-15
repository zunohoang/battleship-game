# Component Diagram - Setup va Placement

## Pham vi
Thanh phan UI, hook, store va utility cua setup.

## Mermaid
```mermaid
flowchart LR
  subgraph UI
    GP[GameSetupPage]
    PB[PlacementBoard]
    SB[PlacementSidebar]
  end
  subgraph Logic
    HK[useGameSetupEngine]
    CTX[GameSetupContext]
    UTL[placementUtils]
  end

  GP --> PB
  GP --> SB
  GP --> HK
  HK --> CTX
  HK --> UTL
  PB --> HK
  SB --> HK
```

## Nguon ma lien quan
- client/src/pages/game-setup.tsx
- client/src/components/game-setup/PlacementBoard.tsx
- client/src/components/game-setup/PlacementSidebar.tsx
- client/src/hooks/useGameSetupEngine.ts
- client/src/store/gameSetupContext.tsx
