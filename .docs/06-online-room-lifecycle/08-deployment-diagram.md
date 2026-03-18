# Deployment Diagram - Room Lifecycle

## Pham vi
Topologi runtime cho room realtime.

## Mermaid
```mermaid
flowchart TB
  C1[Client Owner]
  C2[Client Guest]
  WS[NestJS Socket Gateway]
  DB[(PostgreSQL)]

  C1 <-->|socket.io /game| WS
  C2 <-->|socket.io /game| WS
  WS --> DB
```

## Nguon ma lien quan
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
- docker-compose.yml
