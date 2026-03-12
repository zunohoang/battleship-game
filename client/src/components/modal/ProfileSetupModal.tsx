import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import defaultAvatarSrc from '@/assets/images/default-avatar.svg'
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
  username: string
  signature?: string | null
  avatar?: string | null
}

export function ProfileSetupModal({
  isOpen,
  onClose,
  onSubmit,
  username: initialUsername,
  signature: initialSignature,
  avatar: initialAvatar,
}: ProfileSetupModalProps) {
  const { t } = useTranslation('common')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarSrc, setAvatarSrc] = useState(initialAvatar ?? defaultAvatarSrc)
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
    'h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]'

  // Only affects rendering; it does not overwrite user data in global state.
  const renderAvatarSrc = avatarSrc || defaultAvatarSrc

  return (
    <>
      <Modal isOpen={isOpen} title={t('welcome.modals.profileSetupTitle')} onClose={onClose}>
        <form className="grid gap-4" noValidate onSubmit={handleSubmit}>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              aria-label="Preview avatar"
              className="cursor-pointer overflow-hidden rounded-full w-20 h-20 border-2 border-[#7dbde0] hover:border-[#3f77b2] transition-colors"
            >
              <img src={renderAvatarSrc} alt="Avatar" className="w-full h-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer text-xs font-semibold text-[#2f5f98] underline underline-offset-2 hover:text-[#1f4d84]"
            >
              {t('welcome.modals.changeAvatar')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Username */}
          <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
            <div className="flex justify-between">
              <span>{t('welcome.modals.username')}</span>
              <span className="font-normal text-[#6b8aac]">{username.length}/20</span>
            </div>
            <input
              type="text"
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
          <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
            <div className="flex justify-between">
              <span>{t('welcome.modals.signature')}</span>
              <span className="font-normal text-[#6b8aac]">{signature.length}/200</span>
            </div>
            <textarea
              maxLength={200}
              rows={3}
              value={signature}
              onChange={(e) => {
                setErrorMessage(null)
                setSignature(e.target.value)
              }}
              placeholder={t('welcome.modals.placeholder.signature')}
              className="rounded-xl border border-[#7dbde0] bg-white/85 px-3 py-2 text-[#24425f] outline-none focus:border-[#3f77b2] resize-none text-sm"
            />
          </label>

          {/* Password */}
          <label className="grid gap-1 text-sm font-semibold text-[#3d5472]">
            {t('welcome.modals.password')}
            <input
              type="password"
              autoComplete="new-password"
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
            <p className="rounded-xl border border-[#d36b6b] bg-[#ffe8e8] px-3 py-2 text-sm font-semibold text-[#8f2f2f]">
              {errorMessage}
            </p>
          )}

          <div className="mt-2 flex justify-center">
            <Button variant="primary" type="submit" className="h-11" disabled={!isChanged}>
              {t('welcome.modals.submitProfile')}
            </Button>
          </div>

        </form>
      </Modal>

      {/* Lightbox */}
      {showPreview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
          onClick={() => setShowPreview(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Avatar preview"
        >
          <img
            src={renderAvatarSrc}
            alt="Avatar preview"
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
