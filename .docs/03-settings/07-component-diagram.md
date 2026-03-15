# Component Diagram - Settings

## Pham vi
Thanh phan va phu thuoc cua tinh nang settings.

## Mermaid
```mermaid
flowchart LR
  subgraph UI
    HM[Home Page]
    SM[Settings Modal]
  end
  subgraph State
    SC[Settings Context]
    HK[useSettings Hook]
  end
  subgraph Persist
    SS[settingsStorage]
    LS[(localStorage)]
  end

  HM --> SM
  SM --> HK
  HK --> SC
  SC --> SS
  SS --> LS
```

## Nguon ma lien quan
- client/src/pages/home.tsx
- client/src/components/modal/SettingsModal.tsx
- client/src/store/settingsContext.tsx
- client/src/services/settingsStorage.ts
