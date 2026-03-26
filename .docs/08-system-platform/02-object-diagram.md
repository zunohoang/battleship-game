# Object Diagram - System Platform

## Pham vi
Anh xa doi tuong runtime khi he thong dang phuc vu 1 tran online.

## Mermaid
```mermaid
classDiagram
  class clientA {
    route = "/game/play"
    user = "u-owner"
  }
  class clientB {
    route = "/game/play"
    user = "u-guest"
  }
  class apiNode {
    rest = "up"
    socket = "up"
  }
  class postgres {
    connections = 12
    tx = "active"
  }

  clientA --> apiNode
  clientB --> apiNode
  apiNode --> postgres
```

## Nguon ma lien quan
- docker-compose.yml
- client/src/pages/game-play.tsx
- server/src/main.ts
