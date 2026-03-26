# Component Diagram - Room Lifecycle

## Pham vi
Thanh phan client-server tham gia quan ly phong online.

## Mermaid
```mermaid
flowchart LR
  subgraph Client
    GR[GameRoomsPage]
    WR[WaitingRoomPage]
    HK[useOnlineRoom]
    SOCK[gameSocketService]
  end

  subgraph Server
    GW[GameGateway]
    GS[GameService]
    REPO[Room/Match persistence]
  end

  GR --> HK
  WR --> HK
  HK --> SOCK
  SOCK --> GW
  GW --> GS
  GS --> REPO
```

## Nguon ma lien quan
- client/src/pages/game-rooms.tsx
- client/src/pages/waiting-room.tsx
- client/src/hooks/useOnlineRoom.ts
- client/src/services/gameSocketService.ts
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
