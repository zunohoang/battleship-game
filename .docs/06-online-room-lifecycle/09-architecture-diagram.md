# Architecture Diagram - Room Lifecycle

## Pham vi
Kien truc luong room online theo layer.

## Mermaid
```mermaid
flowchart TB
  subgraph Frontend
    PAGES[Rooms + Waiting pages]
    HOOK[useOnlineRoom]
    SOCKET[Socket Service]
  end
  subgraph Backend
    GATEWAY[GameGateway]
    SERVICE[GameService]
    DOMAIN[Room rules]
  end
  subgraph Data
    ROOM[(game_rooms)]
    MATCH[(game_matches)]
  end

  PAGES --> HOOK
  HOOK --> SOCKET
  SOCKET --> GATEWAY
  GATEWAY --> SERVICE
  SERVICE --> DOMAIN
  SERVICE --> ROOM
  SERVICE --> MATCH
```

## Nguon ma lien quan
- client/src/hooks/useOnlineRoom.ts
- client/src/services/gameSocketService.ts
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
