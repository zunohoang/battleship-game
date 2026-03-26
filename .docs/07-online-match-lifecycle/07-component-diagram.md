# Component Diagram - Online Match

## Pham vi
Thanh phan va phu thuoc cho luong match realtime.

## Mermaid
```mermaid
flowchart LR
  subgraph Client
    GP[GamePlayPage]
    HOOK[useOnlineRoom]
    SOCK[gameSocketService]
  end
  subgraph Server
    GW[GameGateway]
    GS[GameService]
    MOV[(game_moves)]
    MAT[(game_matches)]
  end

  GP --> HOOK
  HOOK --> SOCK
  SOCK --> GW
  GW --> GS
  GS --> MOV
  GS --> MAT
```

## Nguon ma lien quan
- client/src/pages/game-play.tsx
- client/src/hooks/useOnlineRoom.ts
- client/src/services/gameSocketService.ts
- server/src/game/game.gateway.ts
- server/src/game/game.service.ts
