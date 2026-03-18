# Class Diagram - Online Room Lifecycle

## Pham vi
Mo ta lop va quan he cho vong doi phong online.

## Mermaid
```mermaid
classDiagram
  class GameGateway {
    +createRoom(dto)
    +listRooms()
    +joinRoom(dto)
    +leaveRoom(dto)
    +startRoom(dto)
    +markReady(dto)
    +getRoomState(dto)
  }
  class GameService {
    +createRoom(userId,dto)
    +joinRoom(userId,dto)
    +startRoom(userId,roomId)
    +markReady(userId,roomId,placements)
    +leaveRoom(userId,roomId)
  }
  class RoomSnapshot {
    +id
    +code
    +status
    +visibility
    +ownerId
    +guestId
    +ownerReady
    +guestReady
    +currentMatchId
  }
  class MatchSnapshot {
    +id
    +status
    +setupDeadlineAt
  }

  GameGateway --> GameService
  GameService --> RoomSnapshot
  GameService --> MatchSnapshot
```

## Nguon ma lien quan
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
- server/src/game/types/game.types.ts
- client/src/services/gameSocketService.ts
- client/src/hooks/useOnlineRoom.ts
- client/src/types/online.ts
