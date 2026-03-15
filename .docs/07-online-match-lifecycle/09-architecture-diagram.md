# Architecture Diagram - Online Match

## Pham vi
Kien truc match theo luong client realtime -> server authority.

## Mermaid
```mermaid
flowchart TB
  subgraph Frontend
    UI[GamePlayPage]
    RT[useOnlineRoom + socket service]
  end
  subgraph Backend
    G[GameGateway]
    SRV[GameService]
    RULE[Turn/Hit/Win rules]
  end
  subgraph Storage
    M[(game_matches)]
    V[(game_moves)]
  end

  UI --> RT
  RT --> G
  G --> SRV
  SRV --> RULE
  SRV --> M
  SRV --> V
```

## Nguon ma lien quan
- client/src/pages/game-play.tsx
- client/src/hooks/useOnlineRoom.ts
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
