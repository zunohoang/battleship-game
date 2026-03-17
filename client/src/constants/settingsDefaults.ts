import type {
  AppLanguage,
  AppSettings,
  AppTheme,
} from '@/types/settings'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  volume: {
    master: 50,
    backgroundMusic: 50,
    sfx: 80,
    ui: 80,
  },
  language: 'vi',
  theme: 'dark',
}

export const LANGUAGE_OPTIONS: AppLanguage[] = ['en', 'vi']
export const THEME_OPTIONS: AppTheme[] = ['light', 'dark']
