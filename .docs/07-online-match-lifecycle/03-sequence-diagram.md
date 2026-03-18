# Sequence Diagram - Move va Broadcast

## Pham vi
Luong gui nuoc ban, xu ly server va dong bo 2 client.

## Mermaid
```mermaid
sequenceDiagram
  actor P1 as Player A
  participant C1 as Client A
  participant GW as GameGateway
  participant S as GameService
  participant DB as Match/Move Repo
  participant C2 as Client B

  P1->>C1: Chon o (x,y)
  C1->>GW: match:move(matchId,x,y,clientMoveId)
  GW->>S: submitMove(userId,dto)
  S->>DB: validate turn + check duplicate
  S->>S: tinh hit/miss + check winner
  S->>DB: save move + update match
  DB-->>S: updated match
  S-->>GW: match snapshot
  GW-->>C1: server:matchUpdated
  GW-->>C2: server:matchUpdated
```

## Nguon ma lien quan
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
- client/src/services/gameSocketService.ts
- client/src/hooks/useOnlineRoom.ts
