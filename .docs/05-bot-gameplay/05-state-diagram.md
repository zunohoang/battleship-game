# State Diagram - Bot Gameplay

## Pham vi
May trang thai tran dau nguoi-voi-bot.

## Mermaid
```mermaid
stateDiagram-v2
  [*] --> PlayerTurn
  PlayerTurn --> BotTurn: player moved
  PlayerTurn --> Finished: player wins
  BotTurn --> PlayerTurn: bot moved
  BotTurn --> Finished: bot wins
  Finished --> RematchDecision
  RematchDecision --> PlayerTurn: replay
  RematchDecision --> [*]: exit
```

## Nguon ma lien quan
- client/src/pages/game-play.tsx
- client/src/hooks/useGamePlayEngine.ts
