import {
  DEFAULT_APP_SETTINGS,
  type AppLanguage,
  type AppSettings,
  type AppTheme,
} from '@/types/settings'

const SETTINGS_STORAGE_KEY = 'app.settings'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const clampVolume = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

const normalizeLanguage = (value: unknown): AppLanguage =>
  value === 'en' || value === 'vi' ? value : DEFAULT_APP_SETTINGS.language

const normalizeTheme = (value: unknown): AppTheme =>
  value === 'light' || value === 'dark' ? value : DEFAULT_APP_SETTINGS.theme

const normalizeSettings = (value: unknown): AppSettings => {
  if (!isRecord(value)) {
    return DEFAULT_APP_SETTINGS
  }

  const rawVolume = isRecord(value.volume) ? value.volume : {}

  return {
    volume: {
      master: clampVolume(rawVolume.master, DEFAULT_APP_SETTINGS.volume.master),
      backgroundMusic: clampVolume(
        rawVolume.backgroundMusic,
        DEFAULT_APP_SETTINGS.volume.backgroundMusic,
      ),
      sfx: clampVolume(rawVolume.sfx, DEFAULT_APP_SETTINGS.volume.sfx),
      ui: clampVolume(rawVolume.ui, DEFAULT_APP_SETTINGS.volume.ui),
    },
    language: normalizeLanguage(value.language),
    theme: normalizeTheme(value.theme),
  }
}

export const sanitizeVolumeValue = (value: number): number => clampVolume(value, 0)

export const loadAppSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_APP_SETTINGS
    }

    const parsed = JSON.parse(raw)
    return normalizeSettings(parsed)
  } catch {
    return DEFAULT_APP_SETTINGS
  }
}

export const saveAppSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage write errors and keep UI responsive.
  }
}
