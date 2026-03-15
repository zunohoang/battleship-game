# Object Diagram - Settings

## Pham vi
Trang thai doi tuong settings khi nguoi dung da bat mute bgm va doi ngon ngu.

## Mermaid
```mermaid
classDiagram
  class currentSettings {
    language = "vi"
    theme = "dark"
    masterVolume = 80
    bgmVolume = 0
    sfxVolume = 70
    uiVolume = 60
  }
  class uiState {
    isSettingsModalOpen = true
    dirty = true
  }
  class localStorage {
    key = "app.settings"
    value = "{...}"
  }

  uiState --> currentSettings
  currentSettings --> localStorage : persist
```

## Nguon ma lien quan
- client/src/components/modal/SettingsModal.tsx
- client/src/services/settingsStorage.ts
