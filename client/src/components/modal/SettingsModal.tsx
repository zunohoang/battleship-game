import { useState } from 'react'
import { Music, MousePointer2, Volume2, VolumeX, Zap, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useSettings } from '@/hooks/useSettings'
import type { AppLanguage, AppTheme, AppVolumeSettings } from '@/store/settingsContext'

type SettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

type VolumeField = {
  key: keyof AppVolumeSettings
  label: string
  icon: LucideIcon
}

const LANGUAGE_OPTIONS: AppLanguage[] = ['en', 'vi']
const THEME_OPTIONS: AppTheme[] = ['light', 'dark']

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation('common')
  const { settings, setVolume, setLanguage, setTheme } = useSettings()
  const [savedVolumes, setSavedVolumes] = useState<Partial<AppVolumeSettings>>({})

  const volumeFields: VolumeField[] = [
    { key: 'master', label: t('settings.masterVolume'), icon: Volume2 },
    { key: 'backgroundMusic', label: t('settings.backgroundMusic'), icon: Music },
    { key: 'sfx', label: t('settings.sfx'), icon: Zap },
    { key: 'ui', label: t('settings.uiVolume'), icon: MousePointer2 },
  ]

  const handleToggleMute = (channel: keyof AppVolumeSettings) => {
    const currentValue = settings.volume[channel]

    if (currentValue === 0) {
      setVolume(channel, savedVolumes[channel] ?? 50)
      return
    }

    setSavedVolumes((prev) => ({
      ...prev,
      [channel]: currentValue,
    }))
    setVolume(channel, 0)
  }

  const toggleClassName =
    'cursor-pointer ui-button-shell h-10 rounded-sm border text-xs font-bold tracking-[0.14em] uppercase transition-colors'

  return (
    <Modal isOpen={isOpen} title={t('settings.title')} onClose={onClose}>
      <div className='grid gap-4'>
        {volumeFields.map((field) => {
          const volumeValue = settings.volume[field.key]
          const ChannelIcon = field.icon
          const isMuted = volumeValue === 0

          return (
            <label key={field.key} className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
              <div className='flex items-center justify-between gap-3'>
                <span className='flex items-center gap-2'>
                  <ChannelIcon size={14} className='text-(--accent-secondary)' />
                  {field.label}
                </span>
                <span className='flex items-center gap-2 text-xs font-bold text-(--accent-secondary)'>
                  {volumeValue}%
                  <button
                    type='button'
                    onMouseDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleToggleMute(field.key)
                    }}
                    aria-label={
                      isMuted
                        ? t('settings.unmuteVolume', { channel: field.label })
                        : t('settings.muteVolume', { channel: field.label })
                    }
                    className='cursor-pointer rounded-sm border border-(--border-main) bg-black/10 p-1 text-(--accent-secondary) transition-colors hover:bg-(--accent-soft)'
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </span>
              </div>
              <input
                type='range'
                min={0}
                max={100}
                value={volumeValue}
                onChange={(event) => setVolume(field.key, Number(event.target.value))}
                className='h-2 w-full cursor-pointer appearance-none rounded-[3px] bg-[#123647] accent-[#5eeaff]'
              />
            </label>
          )
        })}

        <div className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
          <span>{t('settings.language')}</span>
          <div className='grid grid-cols-2 gap-2'>
            {LANGUAGE_OPTIONS.map((language) => {
              const isActive = settings.language === language
              return (
                <button
                  key={language}
                  type='button'
                  onClick={() => setLanguage(language)}
                  className={`${toggleClassName} ${
                    isActive
                      ? 'ui-button-primary'
                      : 'ui-button-default'
                  }`}
                >
                  {t(`settings.${language}`)}
                </button>
              )
            })}
          </div>
        </div>

        <div className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
          <span>{t('settings.theme')}</span>
          <div className='grid grid-cols-2 gap-2'>
            {THEME_OPTIONS.map((theme) => {
              const isActive = settings.theme === theme
              return (
                <button
                  key={theme}
                  type='button'
                  onClick={() => setTheme(theme)}
                  className={`${toggleClassName} ${
                    isActive
                      ? 'ui-button-primary'
                      : 'ui-button-default'
                  }`}
                >
                  {t(`settings.${theme}`)}
                </button>
              )
            })}
          </div>
        </div>

        <Button variant='primary' onClick={onClose}>
          {t('settings.close')}
        </Button>
      </div>
    </Modal>
  )
}
