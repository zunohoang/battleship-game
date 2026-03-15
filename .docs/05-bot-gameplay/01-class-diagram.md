# Class Diagram - Bot Gameplay

## Pham vi
Mo ta lop du lieu va engine cho tran dau nguoi-voi-bot.

## Mermaid
```mermaid
classDiagram
  class GamePlayEngine {
    +playerBoard
    +botBoard
    +turn
    +timer
    +shoot(x,y)
    +getBotShot()
    +checkWinner()
  }
  class ShotRecord {
    +x: number
    +y: number
    +isHit: bool
    +by: player|bot
    +at: datetime
  }
  class FleetState {
    +ships
    +remainingCells
  }
  class BotStrategy {
    +mode: random|learning|probability
    +nextShot(state)
  }

  GamePlayEngine --> ShotRecord
  GamePlayEngine --> FleetState
  GamePlayEngine --> BotStrategy
```

## Nguon ma lien quan
- client/src/hooks/useGamePlayEngine.ts
- client/src/pages/game-play.tsx
- client/src/components/game-play/FleetPanel.tsx
- client/src/types/game.ts
