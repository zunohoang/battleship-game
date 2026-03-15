# Deployment Diagram - Settings

## Pham vi
Trien khai runtime cua settings tren client.

## Mermaid
```mermaid
flowchart TB
  B[Browser]
  FE[React App]
  ST[(localStorage)]

  B --> FE
  FE --> ST
```

## Nguon ma lien quan
- client/src/services/settingsStorage.ts
- client/src/store/settingsContext.tsx
