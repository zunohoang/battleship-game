# Object Diagram - Bot Gameplay

## Pham vi
Anh xa doi tuong giua tran dau khi den luot cua bot.

## Mermaid
```mermaid
classDiagram
  class matchState {
    turn = "bot"
    timer = 18
    winner = null
  }
  class playerShots {
    count = 12
    last = "(4,6) hit"
  }
  class botShots {
    count = 11
    last = "(3,2) miss"
  }
  class botMemory {
    pendingTargets = 3
    strategy = "learning"
  }

  matchState --> playerShots
  matchState --> botShots
  botMemory --> botShots
```

## Nguon ma lien quan
- client/src/hooks/useGamePlayEngine.ts
- client/src/pages/game-play.tsx
