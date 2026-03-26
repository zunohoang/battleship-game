# Class Diagram - System Platform

## Pham vi
Tong quan cac thanh phan lop chinh giua client, server va persistence.

## Mermaid
```mermaid
classDiagram
  class ClientApp {
    +routes
    +contexts
    +services
  }
  class NestServer {
    +authModule
    +profileModule
    +gameModule
  }
  class Database {
    +users
    +game_rooms
    +game_matches
    +game_moves
  }
  class SocketGateway {
    +roomEvents
    +matchEvents
  }

  ClientApp --> NestServer
  NestServer --> Database
  NestServer --> SocketGateway
```

## Nguon ma lien quan
- client/src/routes/index.tsx
- client/src/services/axios.ts
- client/src/services/gameSocketService.ts
- server/src/app.module.ts
- server/src/game/game.gateway.ts
- server/src/database/data-source.ts
