# Architecture Diagram - Settings

## Pham vi
Kien truc layer cho settings thuoc phia frontend.

## Mermaid
```mermaid
flowchart TB
  subgraph Presentation
    SM[SettingsModal]
  end
  subgraph Application
    SC[SettingsContext]
    HK[useSettings]
  end
  subgraph Infrastructure
    SS[settingsStorage]
    LS[(localStorage)]
  end

  SM --> HK
  HK --> SC
  SC --> SS
  SS --> LS
```

## Nguon ma lien quan
- client/src/components/modal/SettingsModal.tsx
- client/src/hooks/useSettings.ts
- client/src/store/settingsContext.tsx
- client/src/services/settingsStorage.ts
