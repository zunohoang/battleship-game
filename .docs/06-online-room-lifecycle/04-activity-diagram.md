# Activity Diagram - Room Lifecycle

## Pham vi
Workflow room tu waiting den setup/in_game hoac dong phong.

## Mermaid
```mermaid
flowchart TD
  A[Tao phong] --> B[Room waiting]
  B --> C{Co guest vao?}
  C -->|Khong| D[Cho tiep]
  D --> B
  C -->|Co| E[Owner Start]
  E --> F[Room setup]
  F --> G{Ca 2 ready?}
  G -->|Chua| H[Cho mark ready]
  H --> F
  G -->|Roi| I[Room in_game]
  B --> J[Owner leave]
  J --> K[Room closed]
```

## Nguon ma lien quan
- server/src/game/game.service.ts
- client/src/pages/game-rooms.tsx
- client/src/pages/waiting-room.tsx
