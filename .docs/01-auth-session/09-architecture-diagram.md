# Architecture Diagram - Auth va Session

## Pham vi
Goc nhin kien truc theo layer cho nhom tinh nang auth.

## Mermaid
```mermaid
flowchart TB
  subgraph Presentation
    UI[Welcome, Login Modal, Register Modal]
  end

  subgraph ClientApplication
    Context[GlobalContext]
    Service[authService]
    Interceptor[interceptors]
  end

  subgraph BackendApplication
    Controller[AuthController]
    DomainService[AuthService]
    Security[JWT + Password Hasher]
    Persistence[User Repository]
  end

  subgraph Data
    DB[(users)]
  end

  UI --> Context
  UI --> Service
  Service --> Controller
  Interceptor --> Controller
  Controller --> DomainService
  DomainService --> Security
  DomainService --> Persistence
  Persistence --> DB
```

## Nguon ma lien quan
- client/src/pages/welcome.tsx
- client/src/store/globalContext.tsx
- client/src/services/authService.ts
- client/src/services/interceptors.ts
- server/src/auth/auth.controller.ts
- server/src/auth/auth.service.ts
- server/src/auth/infrastructure/persistence/relational/entities/user.entity.ts
