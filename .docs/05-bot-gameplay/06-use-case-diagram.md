# Use Case Diagram - Bot Gameplay

## Pham vi
Use case cua nguoi choi trong mode bot.

## Mermaid
```mermaid
flowchart LR
  U[Nguoi choi]
  SYS[Bot Gameplay System]

  U --> UC1[Bat dau tran bot]
  U --> UC2[Ban vao ban bot]
  U --> UC3[Xem lich su phat ban]
  U --> UC4[Xem tinh trang doi tau]
  U --> UC5[Choi lai]

  UC1 --> SYS
  UC2 --> SYS
  UC3 --> SYS
  UC4 --> SYS
  UC5 --> SYS
```

## Nguon ma lien quan
- client/src/pages/game-play.tsx
- client/src/components/game-play/FleetPanel.tsx
