# Architecture Diagram - Bot Gameplay

## Pham vi
Kien truc theo layer cho mode bot.

## Mermaid
```mermaid
flowchart TB
  subgraph Presentation
    PAGE[GamePlayPage]
    COMP[BattleBoard/FleetPanel/Timer]
  end
  subgraph Application
    ENG[useGamePlayEngine]
  end
  subgraph Domain
    RULES[hit-miss/win rules]
    AI[bot strategies]
    TYPES[game types]
  end

  PAGE --> ENG
  COMP --> ENG
  ENG --> RULES
  ENG --> AI
  ENG --> TYPES
```

## Nguon ma lien quan
- client/src/pages/game-play.tsx
- client/src/hooks/useGamePlayEngine.ts
- client/src/types/game.ts
