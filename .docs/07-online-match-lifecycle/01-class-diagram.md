# Class Diagram - Online Match Lifecycle

## Pham vi
Mo ta lop va quan he cho tran dau online theo luot.

## Mermaid
```mermaid
classDiagram
  class MatchSnapshot {
    +id
    +status
    +player1Id
    +player2Id
    +turnPlayerId
    +winnerId
    +player1Shots
    +player2Shots
    +rematchVotes
    +version
  }
  class ShotRecord {
    +x
    +y
    +isHit
    +at
    +by
    +sequence
    +clientMoveId
  }
  class MoveDto {
    +matchId
    +x
    +y
    +clientMoveId?
  }
  class GameService {
    +submitMove(userId,dto)
    +forfeit(userId,matchId)
    +rematchVote(userId,accept)
    +reconnect(userId,dto)
  }

  MatchSnapshot --> ShotRecord
  GameService --> MoveDto
  GameService --> MatchSnapshot
```

## Nguon ma lien quan
- server/src/game/game.service.ts
- server/src/game/dto/game-events.dto.ts
- server/src/game/types/game.types.ts
- client/src/types/online.ts
- client/src/services/gameSocketService.ts
