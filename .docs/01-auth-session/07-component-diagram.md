# Component Diagram - Auth va Session

## Pham vi
Cac thanh phan client-server phoi hop de dam bao auth/session.

## Mermaid
```mermaid
flowchart LR
  subgraph Client
    P[Welcome Page]
    GS[Global Store]
    SVC[authService]
    INT[Axios Interceptors]
  end

  subgraph Server
    CTRL[AuthController]
    SER[AuthService]
    JWT[JWT Repository]
    HASH[Bcrypt Hasher]
    URepo[User Persistence]
  end

  P --> SVC
  SVC --> CTRL
  INT --> CTRL
  CTRL --> SER
  SER --> JWT
  SER --> HASH
  SER --> URepo
  GS <-- INT
  GS <-- P
```

## Nguon ma lien quan
- client/src/services/authService.ts
- client/src/services/interceptors.ts
- client/src/store/globalContext.tsx
- server/src/auth/auth.controller.ts
- server/src/auth/auth.service.ts
