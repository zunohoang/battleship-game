# ERD - System Platform

## Pham vi
Tong hop ERD cac bang trong he thong backend.

## Mermaid
```mermaid
erDiagram
  USERS ||--o{ GAME_ROOMS : owner_or_guest
  GAME_ROOMS ||--o{ GAME_MATCHES : contains
  GAME_MATCHES ||--o{ GAME_MOVES : records
  USERS ||--o{ GAME_MOVES : performs

  USERS {
    uuid id PK
    string email UK
    string username UK
    string passwordHash
    string avatar
    string signature
  }

  GAME_ROOMS {
    uuid id PK
    string code UK
    string status
    string visibility
    uuid ownerId FK
    uuid guestId FK
    uuid currentMatchId FK
  }

  GAME_MATCHES {
    uuid id PK
    uuid roomId FK
    string status
    uuid player1Id
    uuid player2Id
    uuid turnPlayerId
    uuid winnerId
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
  }
```

## Nguon ma lien quan
- server/src/game/infrastructure/persistence/relational/entities/room.entity.ts
- server/src/game/infrastructure/persistence/relational/entities/match.entity.ts
- server/src/game/infrastructure/persistence/relational/entities/move.entity.ts
- server/src/auth/infrastructure/persistence/relational/entities/user.entity.ts
- server/src/database/migrations/1773446400001-InitGameTables.ts
