# Sequence Diagram - Luot ban voi Bot

## Pham vi
Luong thoi gian tu luot nguoi choi den luot bot va cap nhat UI.

## Mermaid
```mermaid
sequenceDiagram
  actor U as Nguoi choi
  participant GP as GamePlayPage
  participant E as useGamePlayEngine
  participant B as BotStrategy
  participant UI as FleetPanel/Board

  U->>GP: Click o muc tieu
  GP->>E: shoot(x,y)
  E->>E: validate turn + duplicate
  E->>E: tinh hit/miss
  E-->>UI: update board + fleet
  E->>E: checkWinner()
  alt Chua ket thuc
    E->>B: nextShot(state)
    B-->>E: (bx,by)
    E->>E: apply bot shot
    E-->>UI: render bot shot
  end
```

## Nguon ma lien quan
- client/src/pages/game-play.tsx
- client/src/hooks/useGamePlayEngine.ts
