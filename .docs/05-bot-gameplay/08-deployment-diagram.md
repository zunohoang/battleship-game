# Deployment Diagram - Bot Gameplay

## Pham vi
Trien khai mode bot thuan client.

## Mermaid
```mermaid
flowchart TB
  U[User Device]
  FE[React Client]
  MEM[(In-memory game state)]

  U --> FE
  FE --> MEM
```

## Nguon ma lien quan
- client/src/hooks/useGamePlayEngine.ts
- client/src/pages/game-play.tsx
