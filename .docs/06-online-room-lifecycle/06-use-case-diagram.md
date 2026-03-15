# Use Case Diagram - Room Lifecycle

## Pham vi
Use case cua Owner va Guest voi phong online.

## Mermaid
```mermaid
flowchart LR
  O[Owner]
  G[Guest]
  SYS[Online Room System]

  O --> UC1[Tao phong]
  O --> UC2[Start room]
  O --> UC3[Dong phong]
  G --> UC4[Xem danh sach phong]
  G --> UC5[Join theo code]
  O --> UC6[Mark ready]
  G --> UC7[Mark ready]

  UC1 --> SYS
  UC2 --> SYS
  UC3 --> SYS
  UC4 --> SYS
  UC5 --> SYS
  UC6 --> SYS
  UC7 --> SYS
```

## Nguon ma lien quan
- client/src/pages/game-rooms.tsx
- client/src/pages/waiting-room.tsx
- server/src/game/game.gateway.ts
