# Deployment Diagram - Online Match

## Pham vi
Topologi runtime cho tran online qua websocket.

## Mermaid
```mermaid
flowchart TB
  CA[Client A]
  CB[Client B]
  WS[NestJS + Socket.io]
  DB[(PostgreSQL)]

  CA <-->|match:* events| WS
  CB <-->|match:* events| WS
  WS --> DB
```

## Nguon ma lien quan
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
- docker-compose.yml
