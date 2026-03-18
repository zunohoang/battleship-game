# Component Diagram - Bot Gameplay

## Pham vi
Thanh phan UI va logic cua mode bot.

## Mermaid
```mermaid
flowchart LR
  subgraph UI
    GPP[GamePlayPage]
    BB[BattleBoard]
    FP[FleetPanel]
    TT[TurnTimerPanel]
  end
  subgraph Logic
    ENG[useGamePlayEngine]
    BOT[Bot strategy block]
  end

  GPP --> ENG
  GPP --> BB
  GPP --> FP
  GPP --> TT
  BB --> ENG
  FP --> ENG
  ENG --> BOT
```

## Nguon ma lien quan
- client/src/pages/game-play.tsx
- client/src/components/game-play/BattleBoard.tsx
- client/src/components/game-play/FleetPanel.tsx
- client/src/components/game-play/TurnTimerPanel.tsx
- client/src/hooks/useGamePlayEngine.ts
