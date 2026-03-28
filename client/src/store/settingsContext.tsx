/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { sounds } from '@/assets';
import i18n from '@/i18n';
import {
  loadAppSettings,
  sanitizeVolumeValue,
  saveAppSettings,
} from '@/services/settingsStorage';
import type {
  AppLanguage,
  AppSettings,
  AppTheme,
  AppVolumeSettings,
} from '@/types/settings';

type VolumeChannel = keyof AppVolumeSettings;

const getNormalizedVolume = (
  masterVolume: number,
  channelVolume: number,
): number => (masterVolume / 100) * (channelVolume / 100);

const isDisabledInteractiveElement = (element: Element): boolean => {
  if (element instanceof HTMLButtonElement) {
    return element.disabled;
  }

  return element.getAttribute('aria-disabled') === 'true';
};

type SettingsContextValue = {
  settings: AppSettings;
  setVolume: (channel: VolumeChannel, value: number) => void;
  setLanguage: (language: AppLanguage) => void;
  setTheme: (theme: AppTheme) => void;
  playBackgroundMusic: () => Promise<void>;
  stopBackgroundMusic: (options?: { resetTime?: boolean }) => void;
  fadeOutBackgroundMusic: (durationMs?: number) => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadAppSettings(),
  );
  const [shouldPlayBackgroundMusic, setShouldPlayBackgroundMusic] =
    useState(false);

  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const uiClickRef = useRef<HTMLAudioElement | null>(null);
  const fadeAnimationFrameRef = useRef<number | null>(null);
  const isBackgroundMusicFadingRef = useRef(false);

  const clearBackgroundFadeAnimation = useCallback(() => {
    if (fadeAnimationFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(fadeAnimationFrameRef.current);
    fadeAnimationFrameRef.current = null;
  }, []);

  useEffect(() => {
    const backgroundMusic = new Audio(sounds.background1);
    backgroundMusic.loop = true;
    backgroundMusic.preload = 'auto';

    const uiClick = new Audio(sounds.buttonSound);
    uiClick.preload = 'auto';

    backgroundMusicRef.current = backgroundMusic;
    uiClickRef.current = uiClick;

    return () => {
      clearBackgroundFadeAnimation();
      backgroundMusic.pause();
      backgroundMusicRef.current = null;
      uiClickRef.current = null;
    };
  }, [clearBackgroundFadeAnimation]);

  const playBackgroundMusic = useCallback(async () => {
    const backgroundMusic = backgroundMusicRef.current;
    if (!backgroundMusic) {
      return;
    }

    clearBackgroundFadeAnimation();
    isBackgroundMusicFadingRef.current = false;
    setShouldPlayBackgroundMusic(true);

    const volume = getNormalizedVolume(
      settings.volume.master,
      settings.volume.backgroundMusic,
    );
    backgroundMusic.volume = volume;

    if (volume <= 0) {
      backgroundMusic.pause();
      return;
    }

    try {
      await backgroundMusic.play();
    } catch {
      // Autoplay can fail until the first user gesture.
    }
  }, [
    clearBackgroundFadeAnimation,
    settings.volume.backgroundMusic,
    settings.volume.master,
  ]);

  const stopBackgroundMusic = useCallback(
    (options?: { resetTime?: boolean }) => {
      const backgroundMusic = backgroundMusicRef.current;
      if (!backgroundMusic) {
        return;
      }

      clearBackgroundFadeAnimation();
      isBackgroundMusicFadingRef.current = false;
      setShouldPlayBackgroundMusic(false);

      backgroundMusic.pause();
      if (options?.resetTime ?? true) {
        backgroundMusic.currentTime = 0;
      }
    },
    [clearBackgroundFadeAnimation],
  );

  const fadeOutBackgroundMusic = useCallback(
    (durationMs = 500) => {
      const backgroundMusic = backgroundMusicRef.current;
      if (!backgroundMusic) {
        return;
      }

      clearBackgroundFadeAnimation();
      isBackgroundMusicFadingRef.current = true;
      setShouldPlayBackgroundMusic(false);

      const safeDuration = Math.max(100, durationMs);
      const startVolume = backgroundMusic.volume;

      if (startVolume <= 0 || backgroundMusic.paused) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        backgroundMusic.volume = getNormalizedVolume(
          settings.volume.master,
          settings.volume.backgroundMusic,
        );
        isBackgroundMusicFadingRef.current = false;
        return;
      }

      const startedAt = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startedAt;
        const progress = Math.min(1, elapsed / safeDuration);
        backgroundMusic.volume = startVolume * (1 - progress);

        if (progress >= 1) {
          backgroundMusic.pause();
          backgroundMusic.currentTime = 0;
          backgroundMusic.volume = getNormalizedVolume(
            settings.volume.master,
            settings.volume.backgroundMusic,
          );
          isBackgroundMusicFadingRef.current = false;
          fadeAnimationFrameRef.current = null;
          return;
        }

        fadeAnimationFrameRef.current = window.requestAnimationFrame(tick);
      };

      fadeAnimationFrameRef.current = window.requestAnimationFrame(tick);
    },
    [
      clearBackgroundFadeAnimation,
      settings.volume.backgroundMusic,
      settings.volume.master,
    ],
  );

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (i18n.language !== settings.language) {
      void i18n.changeLanguage(settings.language);
    }
  }, [settings.language]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      settings.theme === 'dark',
    );
  }, [settings.theme]);

  useEffect(() => {
    const backgroundMusic = backgroundMusicRef.current;
    if (!backgroundMusic) {
      return;
    }

    const backgroundVolume = getNormalizedVolume(
      settings.volume.master,
      settings.volume.backgroundMusic,
    );

    if (isBackgroundMusicFadingRef.current) {
      return;
    }

    backgroundMusic.volume = backgroundVolume;

    if (!shouldPlayBackgroundMusic || backgroundVolume <= 0) {
      backgroundMusic.pause();
      return;
    }

    void backgroundMusic.play().catch(() => {
      // Autoplay can fail until the first user gesture.
    });
  }, [
    settings.volume.backgroundMusic,
    settings.volume.master,
    shouldPlayBackgroundMusic,
  ]);

  useEffect(() => {
    const uiClick = uiClickRef.current;
    if (!uiClick) {
      return;
    }

    uiClick.volume = getNormalizedVolume(
      settings.volume.master,
      settings.volume.ui,
    );
  }, [settings.volume.master, settings.volume.ui]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const backgroundMusic = backgroundMusicRef.current;
      const backgroundVolume = getNormalizedVolume(
        settings.volume.master,
        settings.volume.backgroundMusic,
      );

      if (
        shouldPlayBackgroundMusic &&
        !isBackgroundMusicFadingRef.current &&
        backgroundMusic &&
        backgroundVolume > 0 &&
        backgroundMusic.paused
      ) {
        backgroundMusic.volume = backgroundVolume;
        void backgroundMusic.play().catch(() => {
          // Ignore gesture or browser playback failures.
        });
      }

      const interactiveElement = target.closest(
        'button, [role="button"], [data-ui-click-sound]',
      );
      if (
        !interactiveElement ||
        isDisabledInteractiveElement(interactiveElement)
      ) {
        return;
      }

      const uiClick = uiClickRef.current;
      const uiVolume = getNormalizedVolume(
        settings.volume.master,
        settings.volume.ui,
      );
      if (!uiClick || uiVolume <= 0) {
        return;
      }

      uiClick.pause();
      uiClick.currentTime = 0;
      uiClick.volume = uiVolume;
      void uiClick.play().catch(() => {
        // Ignore gesture or browser playback failures.
      });
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [
    settings.volume.backgroundMusic,
    settings.volume.master,
    settings.volume.ui,
    shouldPlayBackgroundMusic,
  ]);

  const setVolume = useCallback((channel: VolumeChannel, value: number) => {
    setSettings((prev) => ({
      ...prev,
      volume: {
        ...prev.volume,
        [channel]: sanitizeVolumeValue(value),
      },
    }));
  }, []);

  const setLanguage = useCallback((language: AppLanguage) => {
    setSettings((prev) => ({ ...prev, language }));
  }, []);

  const setTheme = useCallback((theme: AppTheme) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setVolume,
      setLanguage,
      setTheme,
      playBackgroundMusic,
      stopBackgroundMusic,
      fadeOutBackgroundMusic,
    }),
    [
      fadeOutBackgroundMusic,
      playBackgroundMusic,
      settings,
      setLanguage,
      setTheme,
      setVolume,
      stopBackgroundMusic,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
