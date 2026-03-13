/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { sounds } from '@/assets'
import i18n from '@/i18n'
import {
  loadAppSettings,
  sanitizeVolumeValue,
  saveAppSettings,
} from '@/services/settingsStorage'

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

type VolumeChannel = keyof AppVolumeSettings

const getNormalizedVolume = (masterVolume: number, channelVolume: number): number =>
  (masterVolume / 100) * (channelVolume / 100)

const isDisabledInteractiveElement = (element: Element): boolean => {
  if (element instanceof HTMLButtonElement) {
    return element.disabled
  }

  return element.getAttribute('aria-disabled') === 'true'
}

type SettingsContextValue = {
  settings: AppSettings
  setVolume: (channel: VolumeChannel, value: number) => void
  setLanguage: (language: AppLanguage) => void
  setTheme: (theme: AppTheme) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings())

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null)
  const uiClickRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const backgroundMusic = new Audio()
    backgroundMusic.loop = true
    backgroundMusic.preload = 'auto'

    const uiClick = new Audio(sounds.buttonSound)
    uiClick.preload = 'auto'

    backgroundMusicRef.current = backgroundMusic
    uiClickRef.current = uiClick

    return () => {
      backgroundMusic.pause()
      backgroundMusicRef.current = null
      uiClickRef.current = null
    }
  }, [])

  useEffect(() => {
    saveAppSettings(settings)
  }, [settings])

  useEffect(() => {
    if (i18n.language !== settings.language) {
      void i18n.changeLanguage(settings.language)
    }
  }, [settings.language])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  }, [settings.theme])

  useEffect(() => {
    const backgroundMusic = backgroundMusicRef.current
    if (!backgroundMusic) {
      return
    }

    const backgroundVolume = getNormalizedVolume(
      settings.volume.master,
      settings.volume.backgroundMusic,
    )

    backgroundMusic.volume = backgroundVolume

    if (backgroundVolume <= 0) {
      backgroundMusic.pause()
      return
    }

    void backgroundMusic.play().catch(() => {
      // Autoplay can fail until the first user gesture.
    })
  }, [settings.volume.backgroundMusic, settings.volume.master])

  useEffect(() => {
    const uiClick = uiClickRef.current
    if (!uiClick) {
      return
    }

    uiClick.volume = getNormalizedVolume(settings.volume.master, settings.volume.ui)
  }, [settings.volume.master, settings.volume.ui])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      const backgroundMusic = backgroundMusicRef.current
      const backgroundVolume = getNormalizedVolume(
        settings.volume.master,
        settings.volume.backgroundMusic,
      )

      if (backgroundMusic && backgroundVolume > 0 && backgroundMusic.paused) {
        backgroundMusic.volume = backgroundVolume
        void backgroundMusic.play().catch(() => {
          // Ignore gesture or browser playback failures.
        })
      }

      const interactiveElement = target.closest('button, [role="button"], [data-ui-click-sound]')
      if (!interactiveElement || isDisabledInteractiveElement(interactiveElement)) {
        return
      }

      const uiClick = uiClickRef.current
      const uiVolume = getNormalizedVolume(settings.volume.master, settings.volume.ui)
      if (!uiClick || uiVolume <= 0) {
        return
      }

      uiClick.pause()
      uiClick.currentTime = 0
      uiClick.volume = uiVolume
      void uiClick.play().catch(() => {
        // Ignore gesture or browser playback failures.
      })
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [settings.volume.backgroundMusic, settings.volume.master, settings.volume.ui])

  const setVolume = useCallback((channel: VolumeChannel, value: number) => {
    setSettings((prev) => ({
      ...prev,
      volume: {
        ...prev.volume,
        [channel]: sanitizeVolumeValue(value),
      },
    }))
  }, [])

  const setLanguage = useCallback((language: AppLanguage) => {
    setSettings((prev) => ({ ...prev, language }))
  }, [])

  const setTheme = useCallback((theme: AppTheme) => {
    setSettings((prev) => ({ ...prev, theme }))
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setVolume,
      setLanguage,
      setTheme,
    }),
    [settings, setLanguage, setTheme, setVolume],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
