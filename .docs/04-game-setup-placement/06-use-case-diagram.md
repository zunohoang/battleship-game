# Use Case Diagram - Setup va Placement

## Pham vi
Use case chinh cua nguoi choi trong setup.

## Mermaid
```mermaid
flowchart LR
  U[Nguoi choi]
  SYS[Game Setup System]

  U --> UC1[Chon board preset]
  U --> UC2[Tuy chinh board]
  U --> UC3[Tuy chinh fleet]
  U --> UC4[Dat tau thu cong]
  U --> UC5[Dat tau ngau nhien]
  U --> UC6[Xac nhan san sang]

  UC1 --> SYS
  UC2 --> SYS
  UC3 --> SYS
  UC4 --> SYS
  UC5 --> SYS
  UC6 --> SYS
```

## Nguon ma lien quan
- client/src/pages/game-setup.tsx
- client/src/constants/gameDefaults.ts
- client/src/utils/placementUtils.ts
