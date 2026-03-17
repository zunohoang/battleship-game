import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { validateProfileInput } from '@/utils/authValidation'

export type ProfileSetupPayload = {
  avatarFile: File | null
  username: string
  signature: string
  password: string
}

type ProfileSetupModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: ProfileSetupPayload) => Promise<string | null>
  onLogout: () => Promise<void>
  username: string
  signature?: string | null
  avatar?: string | null
}

export function ProfileSetupModal({
  isOpen,
  onClose,
  onSubmit,
  onLogout,
  username: initialUsername,
  signature: initialSignature,
  avatar: initialAvatar,
}: ProfileSetupModalProps) {
  const { t } = useTranslation('common')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const signatureTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [avatarSrc, setAvatarSrc] = useState(initialAvatar?.trim() || null)
  const [username, setUsername] = useState(initialUsername)
  const [signature, setSignature] = useState(initialSignature ?? '')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const [showPreview, setShowPreview] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const isChanged =
    username !== initialUsername ||
    signature !== (initialSignature ?? '') ||
    avatarFile !== null ||
    password !== ''

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setAvatarSrc(ev.target.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const syncSignatureHeight = (textarea?: HTMLTextAreaElement | null) => {
    const target = textarea ?? signatureTextareaRef.current
    if (!target) {
      return
    }

    target.style.height = '0px'
    target.style.height = `${target.scrollHeight}px`
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      syncSignatureHeight()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isOpen, signature])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const validation = validateProfileInput(username, signature, password)

    if (validation.errorCode) {
      setErrorMessage(t(`errors.${validation.errorCode}`))
      return
    }

    const payload: ProfileSetupPayload = {
      avatarFile,
      username: validation.username,
      signature: validation.signature,
      password: validation.password,
    }

    const submitError = await onSubmit(payload)
    if (submitError) {
      setErrorMessage(submitError)
    }
  }

  const inputClassName =
    'ui-input h-11 rounded-sm px-3'

  // Only affects rendering; it does not overwrite user data in global state.
  const renderAvatarSrc = avatarSrc?.trim() || null
  const avatarInitial = username.trim().slice(0, 1).toUpperCase() || 'A'

  return (
    <>
      <Modal isOpen={isOpen} title={t('welcome.modals.profileSetupTitle')} onClose={onClose}>
        <form className='grid gap-4' noValidate onSubmit={handleSubmit}>

          {/* Avatar */}
          <div className='flex flex-col items-center gap-2'>
            <button
              type='button'
              onClick={() => setShowPreview(true)}
              aria-label={t('welcome.modals.previewAvatar')}
              className='h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-(--border-strong) bg-(--accent-soft) transition-colors hover:border-(--accent-secondary)'
            >
              {renderAvatarSrc ? (
                <img
                  src={renderAvatarSrc}
                  alt={t('welcome.modals.avatar')}
                  className='h-full w-full object-cover'
                />
              ) : (
                <span className='flex h-full w-full items-center justify-center font-mono text-3xl font-black text-(--accent-secondary)'>
                  {avatarInitial}
                </span>
              )}
            </button>
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              className='cursor-pointer text-xs font-semibold text-(--accent-secondary) underline underline-offset-4 hover:text-white'
            >
              {t('welcome.modals.changeAvatar')}
            </button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              className='hidden'
              onChange={handleFileChange}
            />
          </div>

          {/* Username */}
          <label className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
            <div className='flex justify-between'>
              <span>{t('welcome.modals.username')}</span>
              <span className='font-normal text-(--text-subtle)'>{username.length}/20</span>
            </div>
            <input
              type='text'
              required
              maxLength={20}
              value={username}
              onChange={(e) => {
                setErrorMessage(null)
                setUsername(e.target.value)
              }}
              className={inputClassName}
            />
          </label>

          {/* Signature */}
          <label className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
            <div className='flex justify-between'>
              <span>{t('welcome.modals.signature')}</span>
              <span className='font-normal text-(--text-subtle)'>{signature.length}/200</span>
            </div>
            <textarea
              ref={signatureTextareaRef}
              maxLength={200}
              rows={3}
              value={signature}
              onChange={(e) => {
                setErrorMessage(null)
                setSignature(e.target.value)
                syncSignatureHeight(e.target)
              }}
              placeholder={t('welcome.modals.placeholder.signature')}
              className='ui-input resize-none overflow-hidden rounded-sm px-3 py-2 text-sm'
            />
          </label>

          {/* Password */}
          <label className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
            {t('welcome.modals.password')}
            <input
              type='password'
              autoComplete='new-password'
              placeholder={t('welcome.modals.placeholder.password')}
              value={password}
              onChange={(e) => {
                setErrorMessage(null)
                setPassword(e.target.value)
              }}
              minLength={8}
              maxLength={72}
              className={inputClassName}
            />
          </label>

          {errorMessage && (
            <p className='rounded-sm border border-[#8d3f47] bg-[#2b1016] px-3 py-2 text-sm font-semibold text-[#ffb4b4]'>
              {errorMessage}
            </p>
          )}

          <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2'>
            <Button
              type='button'
              variant='danger'
              className='h-11'
              onClick={() => {
                void onLogout()
              }}
            >
              {t('welcome.modals.logout')}
            </Button>
            <Button variant='primary' type='submit' className='h-11' disabled={!isChanged}>
              {t('welcome.modals.submitProfile')}
            </Button>
          </div>

        </form>
      </Modal>

      {/* Lightbox */}
      {showPreview && (
        <div
          className='fixed inset-0 z-60 flex items-center justify-center bg-[#020912]/88 backdrop-blur-sm'
          onClick={() => setShowPreview(false)}
          role='dialog'
          aria-modal='true'
          aria-label={t('welcome.modals.avatarPreview')}
        >
          {renderAvatarSrc ? (
            <img
              src={renderAvatarSrc}
              alt={t('welcome.modals.avatarPreview')}
              className='max-h-[90vh] max-w-[90vw] rounded-md border border-(--border-strong) shadow-[0_0_30px_rgba(0,174,255,0.22)]'
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className='flex h-48 w-48 items-center justify-center rounded-full border border-(--border-strong) bg-(--accent-soft) font-mono text-7xl font-black text-(--accent-secondary) shadow-[0_0_30px_rgba(0,174,255,0.22)]'
              onClick={(e) => e.stopPropagation()}
            >
              {avatarInitial}
            </div>
          )}
        </div>
      )}
    </>
  )
}
