# Object Diagram - Auth va Session

## Pham vi
Anh xa doi tuong thuc te tai thoi diem nguoi dung vua dang nhap thanh cong va he thong dang giu refresh token hop le.

## Mermaid
```mermaid
classDiagram
  class currentUser {
    id = "3f3a-..."
    username = "captainA"
    email = "captainA@mail.com"
    isAnonymous = false
  }

  class authState {
    accessToken = "eyJ..."
    refreshCookie = "rt=...; HttpOnly"
    reasonCode = null
  }

  class refreshSession {
    refreshTokenHash = "sha256:..."
    absoluteExpiry = 1773446400
  }

  class axiosRuntime {
    isRefreshing = false
    retryQueueSize = 0
  }

  currentUser --> authState : su dung
  authState --> refreshSession : rang buoc
  axiosRuntime --> authState : doc/ghi
```

## Nguon ma lien quan
- client/src/store/globalContext.tsx
- client/src/services/interceptors.ts
- server/src/auth/auth.service.ts
- server/src/auth/infrastructure/persistence/relational/entities/user.entity.ts
