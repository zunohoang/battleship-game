# ERD - Online Match

## Pham vi
Quan he du lieu match va move trong gameplay online.

## Mermaid
```mermaid
erDiagram
  GAME_MATCHES ||--o{ GAME_MOVES : records
  USERS ||--o{ GAME_MOVES : fires

  GAME_MATCHES {
    uuid id PK
    uuid roomId FK
    string status
    uuid player1Id
    uuid player2Id
    uuid turnPlayerId
    uuid winnerId
    jsonb player1Shots
    jsonb player2Shots
    jsonb rematchVotes
    int version
  }

  GAME_MOVES {
    uuid id PK
    uuid matchId FK
    uuid playerId FK
    int x
    int y
    bool isHit
    int sequence
    string clientMoveId
  }
```

## Nguon ma lien quan
- server/src/game/infrastructure/persistence/relational/entities/match.entity.ts
- server/src/game/infrastructure/persistence/relational/entities/move.entity.ts
- server/src/database/migrations/1773446400001-InitGameTables.ts
