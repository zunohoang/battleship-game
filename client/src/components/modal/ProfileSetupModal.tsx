import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import defaultAvatarSrc from '@/assets/images/default-avatar.svg'

export type ProfileSetupPayload = {
  avatarFile: File | null
  avatarSrc: string
  username: string
  signature: string
  password: string
}

type ProfileSetupModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: ProfileSetupPayload) => void
  username: string
}

export function ProfileSetupModal({
  isOpen,
  onClose,
  onSubmit,
  username: initialUsername,
}: ProfileSetupModalProps) {
  const { t } = useTranslation('common')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarSrc, setAvatarSrc] = useState(defaultAvatarSrc)
  const [username, setUsername] = useState(initialUsername)
  const [signature, setSignature] = useState('')
  const [password, setPassword] = useState('')
  
  const [showPreview, setShowPreview] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const isChanged =
    username !== initialUsername ||
    signature !== '' ||
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const payload: ProfileSetupPayload = { avatarFile, avatarSrc, username, signature, password }
    console.log('[ProfileSetupModal] payload:', payload)
    onSubmit(payload)
  }

  const inputClassName =
    'h-11 rounded-xl border border-[#7dbde0] bg-white/85 px-3 text-[#24425f] outline-none focus:border-[#3f77b2]'

  return (
    <>
      <Modal isOpen={isOpen} title={t('welcome.modals.profileSetupTitle')} onClose={onClose}>
        <form className="grid gap-4" onSubmit={handleSubmit}>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              aria-label="Preview avatar"
              className="cursor-pointer overflow-hidden rounded-full w-20 h-20 border-2 border-[#7dbde0] hover:border-[#3f77b2] transition-colors"
            >
              <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
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
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setSignature(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
            />
          </label>

          <div className="mt-2 flex gap-3">
            <Button variant="primary" type="submit" className="h-11" disabled={!isChanged}>
              {t('welcome.modals.submitProfile')}
            </Button>
            <Button type="button" className="h-11" onClick={onClose}>
              {t('welcome.modals.cancel')}
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
            src={avatarSrc}
            alt="Avatar preview"
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
