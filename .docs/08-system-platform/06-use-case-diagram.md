# Use Case Diagram - System Platform

## Pham vi
Use case tong hop cua toan he thong.

## Mermaid
```mermaid
flowchart LR
  U[Nguoi choi]
  A[He thong BTSHIP]

  U --> UC1[Xac thuc tai khoan]
  U --> UC2[Quan ly profile]
  U --> UC3[Cau hinh settings]
  U --> UC4[Choi voi bot]
  U --> UC5[Choi online]
  U --> UC6[Rematch]

  UC1 --> A
  UC2 --> A
  UC3 --> A
  UC4 --> A
  UC5 --> A
  UC6 --> A
```

## Nguon ma lien quan
- client/src/pages/welcome.tsx
- client/src/pages/home.tsx
- client/src/pages/game-play.tsx
- server/src/app.module.ts
