# Deployment Diagram - Setup va Placement

## Pham vi
Trien khai runtime cho setup tren client va du lieu cau hinh.

## Mermaid
```mermaid
flowchart TB
  B[Browser]
  FE[React Client]
  LS[(localStorage optional)]

  B --> FE
  FE --> LS
```

## Nguon ma lien quan
- client/src/pages/game-setup.tsx
- client/src/store/gameSetupContext.tsx
