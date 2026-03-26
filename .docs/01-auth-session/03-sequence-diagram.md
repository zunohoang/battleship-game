# Sequence Diagram - Dang nhap va Refresh

## Pham vi
Luong thoi gian tu login den refresh token khi access token het han.

## Mermaid
```mermaid
sequenceDiagram
  actor U as Nguoi dung
  participant C as Client Welcome Page
  participant AS as authService client
  participant API as AuthController
  participant S as AuthService
  participant DB as User Repository
  participant INT as Axios Interceptor
  participant GC as GlobalContext

  U->>C: Nhap email va password
  C->>AS: login(payload)
  AS->>API: POST /auth/login
  API->>S: login(dto)
  S->>DB: tim user theo email
  DB-->>S: user
  S-->>API: accessToken + cookie refresh
  API-->>AS: 200 OK
  AS-->>C: user + accessToken
  C->>GC: setUser(user)

  Note over INT,API: Sau do access token het han
  INT->>API: request API bat ky
  API-->>INT: 401 Unauthorized
  INT->>API: POST /auth/refresh
  API->>S: refresh(refreshToken)
  S->>DB: verify refresh hash + absolute expiry
  DB-->>S: hop le
  S-->>API: accessToken moi
  API-->>INT: 200 OK
  INT-->>C: retry request cu

  alt refresh khong hop le
    S-->>API: INVALID_REFRESH_TOKEN
    API-->>INT: 401
    INT->>GC: forceLogout("INVALID_REFRESH_TOKEN")
  end
```

## Nguon ma lien quan
- client/src/pages/welcome.tsx
- client/src/services/authService.ts
- client/src/services/interceptors.ts
- client/src/store/globalContext.tsx
- server/src/auth/auth.controller.ts
- server/src/auth/auth.service.ts
