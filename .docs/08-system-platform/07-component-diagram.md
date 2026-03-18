# Component Diagram - System Platform

## Pham vi
Thanh phan kien truc chinh toan he thong.

## Mermaid
```mermaid
flowchart LR
  subgraph Frontend
    ROUTE[Routes + Pages]
    STORE[Contexts]
    SRV1[HTTP services]
    SRV2[Socket service]
  end

  subgraph Backend
    AUTH[Auth Module]
    PROF[Profile Module]
    GAME[Game Module]
    COM[Common Module]
  end

  subgraph Infra
    DB[(PostgreSQL)]
    UP[/uploads/]
  end

  ROUTE --> STORE
  STORE --> SRV1
  STORE --> SRV2
  SRV1 --> AUTH
  SRV1 --> PROF
  SRV2 --> GAME
  AUTH --> DB
  PROF --> DB
  PROF --> UP
  GAME --> DB
  COM --> AUTH
  COM --> GAME
```

## Nguon ma lien quan
- client/src/store
- client/src/services
- server/src/auth
- server/src/profile
- server/src/game
- server/src/common
