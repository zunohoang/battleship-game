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
