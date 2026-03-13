import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useSettings } from '@/hooks/useSettings'
import type { AppLanguage, AppTheme, AppVolumeSettings } from '@/types/settings'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

type VolumeField = {
  key: keyof AppVolumeSettings
  label: string
}

const LANGUAGE_OPTIONS: AppLanguage[] = ['en', 'vi']
const THEME_OPTIONS: AppTheme[] = ['light', 'dark']

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation('common')
  const { settings, setVolume, setLanguage, setTheme } = useSettings()

  const volumeFields: VolumeField[] = [
    { key: 'master', label: t('settings.masterVolume') },
    { key: 'backgroundMusic', label: t('settings.backgroundMusic') },
    { key: 'sfx', label: t('settings.sfx') },
    { key: 'ui', label: t('settings.uiVolume') },
  ]

  const toggleClassName =
    'h-10 rounded-xl border text-xs font-bold tracking-[0.14em] uppercase transition-colors'

  return (
    <Modal isOpen={isOpen} title={t('settings.title')} onClose={onClose}>
      <div className="grid gap-4">
        {volumeFields.map((field) => {
          const volumeValue = settings.volume[field.key]

          return (
            <label key={field.key} className="grid gap-2 text-sm font-semibold text-[#3d5472]">
              <div className="flex items-center justify-between gap-3">
                <span>{field.label}</span>
                <span className="text-xs font-bold text-[#2f5f98]">{volumeValue}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={volumeValue}
                onChange={(event) => setVolume(field.key, Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#bfd8ee] accent-[#3f77b2]"
              />
            </label>
          )
        })}

        <div className="grid gap-2 text-sm font-semibold text-[#3d5472]">
          <span>{t('settings.language')}</span>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGE_OPTIONS.map((language) => {
              const isActive = settings.language === language
              return (
                <button
                  key={language}
                  type="button"
                  onClick={() => setLanguage(language)}
                  className={`${toggleClassName} ${
                    isActive
                      ? 'border-[#3f77b2] bg-[#3f77b2]/85 text-white'
                      : 'border-[#7dbde0] bg-white/70 text-[#3d5472] hover:bg-gray-100/90'
                  }`}
                >
                  {t(`settings.${language}`)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-2 text-sm font-semibold text-[#3d5472]">
          <span>{t('settings.theme')}</span>
          <div className="grid grid-cols-2 gap-2">
            {THEME_OPTIONS.map((theme) => {
              const isActive = settings.theme === theme
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setTheme(theme)}
                  className={`${toggleClassName} ${
                    isActive
                      ? 'border-[#3f77b2] bg-[#3f77b2]/85 text-white'
                      : 'border-[#7dbde0] bg-white/70 text-[#3d5472] hover:bg-gray-100/90'
                  }`}
                >
                  {t(`settings.${theme}`)}
                </button>
              )
            })}
          </div>
        </div>

        <Button variant="primary" onClick={onClose}>
          {t('settings.close')}
        </Button>
      </div>
    </Modal>
  )
}
