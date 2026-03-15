# Architecture Diagram - Setup va Placement

## Pham vi
Kien truc setup theo layer presentation -> application -> utility.

## Mermaid
```mermaid
flowchart TB
  subgraph Presentation
    P1[GameSetupPage]
    P2[Placement components]
  end
  subgraph Application
    H[useGameSetupEngine]
    C[GameSetupContext]
  end
  subgraph DomainUtility
    U[placementUtils]
    T[types/game]
  end

  P1 --> H
  P2 --> H
  H --> C
  H --> U
  U --> T
```

## Nguon ma lien quan
- client/src/pages/game-setup.tsx
- client/src/hooks/useGameSetupEngine.ts
- client/src/store/gameSetupContext.tsx
- client/src/utils/placementUtils.ts
- client/src/types/game.ts
