# ERD - Setup va Placement

## Pham vi
Mo hinh logic du lieu setup o phia client.

## Mermaid
```mermaid
erDiagram
  GAME_SETUP_STATE ||--|| GAME_CONFIG : contains
  GAME_CONFIG ||--|| BOARD_CONFIG : has
  GAME_CONFIG ||--o{ SHIP_DEFINITION : defines
  GAME_SETUP_STATE ||--o{ PLACED_SHIP : stores

  GAME_SETUP_STATE {
    string mode
    bool isReady
  }
  GAME_CONFIG {
    int rows
    int cols
  }
  SHIP_DEFINITION {
    string id PK
    string name
    int size
    int count
  }
  PLACED_SHIP {
    string definitionId FK
    int instanceIndex
    int x
    int y
    string orientation
  }
```

## Nguon ma lien quan
- client/src/types/game.ts
- client/src/store/gameSetupContext.tsx
- client/src/constants/gameDefaults.ts
