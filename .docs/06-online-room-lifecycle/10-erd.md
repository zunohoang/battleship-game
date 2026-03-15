# ERD - Room Lifecycle

## Pham vi
Quan he du lieu room va match cho vong doi phong.

## Mermaid
```mermaid
erDiagram
  USERS ||--o{ GAME_ROOMS : owns_or_joins
  GAME_ROOMS ||--o{ GAME_MATCHES : has

  GAME_ROOMS {
    uuid id PK
    string code UK
    string status
    string visibility
    uuid ownerId FK
    uuid guestId FK
    uuid currentMatchId FK
    bool ownerReady
    bool guestReady
  }

  GAME_MATCHES {
    uuid id PK
    uuid roomId FK
    string status
    datetime setupDeadlineAt
    int version
  }
```

## Nguon ma lien quan
- server/src/game/infrastructure/persistence/relational/entities/room.entity.ts
- server/src/game/infrastructure/persistence/relational/entities/match.entity.ts
- server/src/database/migrations/1773446400001-InitGameTables.ts
- server/src/database/migrations/1773446400002-AddSetupDeadlineToMatches.ts
