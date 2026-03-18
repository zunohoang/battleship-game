# Use Case Diagram - Auth va Session

## Pham vi
Tac nhan va use case chinh lien quan den xac thuc nguoi dung.

## Mermaid
```mermaid
flowchart LR
  U[Nguoi dung]
  C[Client App]
  A[Auth API]

  U --> UC1[Dang ky tai khoan]
  U --> UC2[Dang nhap]
  U --> UC3[Dang xuat]
  U --> UC4[Choi an danh]

  C --> UC5[Tu dong refresh token]
  C --> UC6[Force logout khi refresh loi]

  UC1 --> A
  UC2 --> A
  UC3 --> A
  UC5 --> A
```

## Nguon ma lien quan
- client/src/pages/welcome.tsx
- client/src/services/authService.ts
- client/src/services/interceptors.ts
- server/src/auth/auth.controller.ts
