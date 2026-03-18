# Sequence Diagram - Tao va vao phong

## Pham vi
Luong tao phong, tham gia phong, bat dau setup.

## Mermaid
```mermaid
sequenceDiagram
  actor O as Owner
  actor G as Guest
  participant C1 as Client Owner
  participant C2 as Client Guest
  participant WS as GameGateway
  participant S as GameService

  O->>C1: Tao phong
  C1->>WS: room:create
  WS->>S: createRoom(ownerId,dto)
  S-->>WS: room + match
  WS-->>C1: roomUpdated

  G->>C2: Nhap roomCode
  C2->>WS: room:join
  WS->>S: joinRoom(guestId,code)
  S-->>WS: room updated
  WS-->>C1: roomUpdated
  WS-->>C2: roomUpdated

  O->>C1: Bam Start
  C1->>WS: room:start
  WS->>S: startRoom(ownerId,roomId)
  S-->>WS: status=setup,deadline set
  WS-->>C1: roomUpdated
  WS-->>C2: roomUpdated
```

## Nguon ma lien quan
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
- client/src/pages/game-rooms.tsx
- client/src/pages/waiting-room.tsx
- client/src/services/gameSocketService.ts
