# Activity Diagram - Match Lifecycle

## Pham vi
Workflow tran dau online tu in_progress den finished/rematch.

## Mermaid
```mermaid
flowchart TD
  A[Match in_progress] --> B[Nguoi choi hien tai ban]
  B --> C{Hop le turn + toa do?}
  C -->|Khong| D[Tra loi loi]
  D --> A
  C -->|Co| E[Ghi shot + cap nhat turn]
  E --> F{Tat ca tau doi thu da bi pha?}
  F -->|Khong| A
  F -->|Co| G[Match finished]
  G --> H{Forfeit hoac ket thuc binh thuong}
  H --> I[Mo rematch voting]
  I --> J{Ca 2 dong y?}
  J -->|Co| K[Tao match moi setup]
  J -->|Khong| L[Ket thuc phong]
```

## Nguon ma lien quan
- server/src/game/game.service.ts
- client/src/pages/game-play.tsx
