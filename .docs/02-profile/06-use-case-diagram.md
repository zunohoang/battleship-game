# Use Case Diagram - Profile

## Pham vi
Tac nhan va use case cho quan ly profile.

## Mermaid
```mermaid
flowchart LR
  U[Nguoi dung da dang nhap]
  APP[Client App]
  API[Profile API]

  U --> UC1[Cap nhat username]
  U --> UC2[Cap nhat signature]
  U --> UC3[Doi mat khau]
  U --> UC4[Cap nhat avatar]

  UC1 --> APP
  UC2 --> APP
  UC3 --> APP
  UC4 --> APP
  APP --> API
```

## Nguon ma lien quan
- client/src/pages/home.tsx
- client/src/components/modal/ProfileSetupModal.tsx
- server/src/profile/profile.controller.ts
