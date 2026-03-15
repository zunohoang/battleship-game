# Object Diagram - Game Setup va Placement

## Pham vi
Anh xa doi tuong mau tai thoi diem nguoi choi da dat du 5 tau tren ban 10x10.

## Mermaid
```mermaid
classDiagram
  class boardConfig {
    rows = 10
    cols = 10
  }
  class fleet {
    carrier = "size 5 x1"
    battleship = "size 4 x1"
    cruiser = "size 3 x1"
    submarine = "size 3 x1"
    destroyer = "size 2 x1"
  }
  class placements {
    total = 5
    occupiedCells = 17
    isReady = true
  }

  fleet --> placements
  boardConfig --> placements
```

## Nguon ma lien quan
- client/src/pages/game-setup.tsx
- client/src/store/gameSetupContext.tsx
- client/src/utils/placementUtils.ts
