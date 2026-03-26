# Activity Diagram - He thong tong the

## Pham vi
Workflow muc cao tu authentication den gameplay.

## Mermaid
```mermaid
flowchart TD
  A[User mo app] --> B[Dang nhap/An danh]
  B --> C[Chon mode Bot hoac Online]
  C -->|Bot| D[Setup va choi offline]
  C -->|Online| E[Tao/vao phong]
  E --> F[Setup room]
  F --> G[Match online]
  D --> H[Game over]
  G --> H
  H --> I[Rematch hoac ve Home]
```

## Nguon ma lien quan
- client/src/pages/welcome.tsx
- client/src/pages/home.tsx
- client/src/pages/game-rooms.tsx
- client/src/pages/game-play.tsx
