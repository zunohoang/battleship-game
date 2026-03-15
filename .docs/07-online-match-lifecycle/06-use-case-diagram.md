# Use Case Diagram - Online Match

## Pham vi
Use case cua 2 nguoi choi trong tran online.

## Mermaid
```mermaid
flowchart LR
  A[Player A]
  B[Player B]
  SYS[Online Match System]

  A --> UC1[Gui nuoc ban]
  B --> UC1
  A --> UC2[Forfeit]
  B --> UC2
  A --> UC3[Reconnect]
  B --> UC3
  A --> UC4[Vote rematch]
  B --> UC4

  UC1 --> SYS
  UC2 --> SYS
  UC3 --> SYS
  UC4 --> SYS
```

## Nguon ma lien quan
- client/src/pages/game-play.tsx
- client/src/services/gameSocketService.ts
- server/src/game/game.gateway.ts
