# Class Diagram - Auth va Session

## Pham vi
Mo ta cac lop va quan he chinh cho dang ky, dang nhap, refresh token, logout va force logout o client.

## Mermaid
```mermaid
classDiagram
  class AuthController {
    +register(dto)
    +login(dto)
    +refresh(req,res)
    +logout(req,res)
  }

  class AuthService {
    +register(dto)
    +login(dto)
    +refresh(token)
    +logout(userId)
  }

  class JwtTokenRepository {
    +signAccessToken(payload)
    +signRefreshToken(payload)
    +verifyRefreshToken(token)
  }

  class PasswordHasher {
    +hash(raw)
    +compare(raw, hashed)
  }

  class User {
    +id: uuid
    +email: string
    +username: string
    +passwordHash: string
    +refreshTokenHash: string?
    +refreshTokenAbsoluteExpiry: number?
  }

  class AuthServiceClient {
    +register(payload)
    +login(payload)
    +logout()
  }

  class AxiosInterceptors {
    +onRequest(config)
    +onResponseSuccess(res)
    +onResponseError(err)
  }

  class GlobalContext {
    +user
    +setUser(user)
    +forceLogout(reasonCode)
  }

  AuthController --> AuthService
  AuthService --> JwtTokenRepository
  AuthService --> PasswordHasher
  AuthService --> User
  AuthServiceClient --> AuthController
  AxiosInterceptors --> AuthServiceClient
  AxiosInterceptors --> GlobalContext
```

## Nguon ma lien quan
- client/src/services/authService.ts
- client/src/services/interceptors.ts
- client/src/store/globalContext.tsx
- server/src/auth/auth.controller.ts
- server/src/auth/auth.service.ts
- server/src/auth/jwt.strategy.ts
- server/src/auth/infrastructure/persistence/relational/entities/user.entity.ts
