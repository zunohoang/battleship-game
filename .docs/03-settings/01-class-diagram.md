# Class Diagram - Settings

## Pham vi
Mo ta cac lop va quan he cho quan ly language, theme va volume.

## Mermaid
```mermaid
classDiagram
  class SettingsContext {
    +settings
    +updateLanguage(lang)
    +updateTheme(theme)
    +updateVolume(channel,value)
    +toggleMute(channel)
  }
  class SettingsModal {
    +open()
    +save()
    +resetDefault()
  }
  class SettingsStorage {
    +load()
    +save(settings)
  }
  class AppSettings {
    +language: en|vi
    +theme: light|dark
    +masterVolume: number
    +bgmVolume: number
    +sfxVolume: number
    +uiVolume: number
  }

  SettingsModal --> SettingsContext
  SettingsContext --> SettingsStorage
  SettingsContext --> AppSettings
```

## Nguon ma lien quan
- client/src/components/modal/SettingsModal.tsx
- client/src/store/settingsContext.tsx
- client/src/hooks/useSettings.ts
- client/src/services/settingsStorage.ts
