# Sequence Diagram - End-to-End Request

## Pham vi
Luong tong quat request REST va su kien websocket.

## Mermaid
```mermaid
sequenceDiagram
  actor U as User
  participant FE as Client App
  participant AX as Axios/Socket Service
  participant API as Nest Controller/Gateway
  participant SV as Service Layer
  participant DB as PostgreSQL

  U->>FE: Thuc hien thao tac
  FE->>AX: Tao request/event
  AX->>API: REST hoac WebSocket
  API->>SV: Xu ly nghiep vu
  SV->>DB: Doc/ghi du lieu
  DB-->>SV: Ket qua
  SV-->>API: response/snapshot
  API-->>AX: payload
  AX-->>FE: cap nhat state
```

## Nguon ma lien quan
- client/src/services/axios.ts
- client/src/services/gameSocketService.ts
- server/src/auth/auth.controller.ts
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
