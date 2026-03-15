# ERD - Settings

## Pham vi
Settings duoc luu local, khong co bang DB rieng tren server.

## Mermaid
```mermaid
erDiagram
  APP_SETTINGS_LOCAL {
    string key PK
    string language
    string theme
    int masterVolume
    int bgmVolume
    int sfxVolume
    int uiVolume
    datetime updatedAt
  }
```

## Nguon ma lien quan
- client/src/services/settingsStorage.ts
- client/src/store/settingsContext.tsx
