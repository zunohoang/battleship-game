# Sequence Diagram - Profile Update

## Pham vi
Luong cap nhat profile tu UI den backend, bao gom avatar va password.

## Mermaid
```mermaid
sequenceDiagram
  actor U as Nguoi dung
  participant M as ProfileSetupModal
  participant C as authService client
  participant API as ProfileController
  participant S as ProfileService
  participant DB as User Repository

  U->>M: Nhap username/signature/password/avatar
  M->>C: updateProfile(formData)
  C->>API: PATCH /users/me
  API->>S: updateProfile(userId,dto,file)
  S->>DB: tim user + validate username trung
  DB-->>S: user hop le
  S->>S: hash password neu co
  S->>S: luu avatar URL neu co file
  S->>DB: save user
  DB-->>S: updated user
  S-->>API: accessToken moi + user
  API-->>C: 200 OK
  C-->>M: ket qua
  M->>M: dong modal + thong bao thanh cong
```

## Nguon ma lien quan
- client/src/components/modal/ProfileSetupModal.tsx
- client/src/services/authService.ts
- server/src/profile/profile.controller.ts
- server/src/profile/profile.service.ts
