export type AppLanguage = 'en' | 'vi'
export type AppTheme = 'light' | 'dark'

export type AppVolumeSettings = {
  master: number
  backgroundMusic: number
  sfx: number
  ui: number
}

export type AppSettings = {
  volume: AppVolumeSettings
  language: AppLanguage
  theme: AppTheme
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  volume: {
    master: 30,
    backgroundMusic: 30,
    sfx: 80,
    ui: 80,
  },
  language: 'vi',
  theme: 'light',
}