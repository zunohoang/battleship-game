# Activity Diagram - Auth va Session

## Pham vi
Mo ta workflow dang ky, dang nhap, refresh va logout.

## Mermaid
```mermaid
flowchart TD
  A[Mo man hinh Welcome] --> B{Nguoi dung chon gi?}
  B -->|Dang ky| C[Nhap username email password]
  C --> D{Hop le?}
  D -->|Khong| E[Hien loi validate]
  E --> B
  D -->|Co| F[POST auth/register]
  F --> G[Dang nhap thanh cong]

  B -->|Dang nhap| H[Nhap email password]
  H --> I{Hop le?}
  I -->|Khong| E
  I -->|Co| J[POST auth/login]
  J --> K[Luu access token va user]
  K --> L[Di den Home]

  L --> M[Goi API bao ve]
  M --> N{Access token het han?}
  N -->|Khong| O[Tiep tuc]
  N -->|Co| P[POST auth/refresh]
  P --> Q{Refresh hop le?}
  Q -->|Co| R[Cap nhat access token]
  R --> O
  Q -->|Khong| S[forceLogout + xoa token]
  S --> A

  L --> T[User bam Logout]
  T --> U[POST auth/logout]
  U --> V[Xoa session client]
  V --> A
```

## Nguon ma lien quan
- client/src/pages/welcome.tsx
- client/src/services/interceptors.ts
- client/src/services/authService.ts
- server/src/auth/auth.controller.ts
