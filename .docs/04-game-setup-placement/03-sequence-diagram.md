# Sequence Diagram - Dat tau

## Pham vi
Luong dat tau va xac nhan san sang trong setup.

## Mermaid
```mermaid
sequenceDiagram
  actor U as Nguoi choi
  participant P as GameSetupPage
  participant E as useGameSetupEngine
  participant G as GameSetupContext
  participant UTL as placementUtils

  U->>P: Chon kich thuoc ban + doi tau
  P->>G: setConfig(board,ships)
  U->>P: Keo tha tau vao o
  P->>E: placeShip(ship,x,y,orientation)
  E->>UTL: canPlace(placements,ship,x,y)
  UTL-->>E: hop le/khong hop le
  E->>G: setPlacements(newPlacements)
  U->>P: Bam San sang
  P->>E: markReady()
  E->>UTL: validateAllShipsPlaced()
  UTL-->>E: true
  E->>G: isReady=true
```

## Nguon ma lien quan
- client/src/pages/game-setup.tsx
- client/src/hooks/useGameSetupEngine.ts
- client/src/store/gameSetupContext.tsx
- client/src/utils/placementUtils.ts
