# State Diagram - Session Token

## Pham vi
Mo ta may trang thai session o client va server.

## Mermaid
```mermaid
stateDiagram-v2
  [*] --> Anonymous
  Anonymous --> Authenticating: submit login/register
  Authenticating --> Authenticated: success
  Authenticating --> Anonymous: fail

  Authenticated --> AccessExpired: access token het han
  AccessExpired --> Refreshing: interceptor goi refresh
  Refreshing --> Authenticated: refresh success
  Refreshing --> ForcedLogout: refresh fail

  Authenticated --> LoggingOut: user bam logout
  LoggingOut --> Anonymous: done

  ForcedLogout --> Anonymous: xoa token + reset user
```

## Nguon ma lien quan
- client/src/services/interceptors.ts
- client/src/store/globalContext.tsx
- server/src/auth/auth.service.ts
