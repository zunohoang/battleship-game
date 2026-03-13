import Lottie from 'lottie-react'
import { useTranslation } from 'react-i18next'
import { lotties } from '../assets'

// Chưa sử dụng, không động vào

export function NotFound({
  error,
  reset
}: {
  error: Error
  info?: { componentStack: string }
  reset: () => void
}) {
  const { t } = useTranslation()

  return (
    <div
      className='min-h-screen flex flex-col justify-center items-center gap-6 text-center px-4'
      style={{ backgroundColor: '#07070f', color: '#e5e7eb' }}
    >
      <Lottie
        animationData={lotties.lottieNotFound404}
        loop
        className='w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80'
      />

      <h1 className="font-['Space_Mono'] text-xl sm:text-2xl font-bold text-white">
        {t('errors.unexpected')}
      </h1>

      {error.message && (
        <div className='w-full max-w-lg'>
          <pre className="font-['Space_Mono'] text-xs text-center border border-red-500/50 bg-red-500/5 p-3 text-red-400 overflow-auto rounded-md leading-relaxed whitespace-pre-wrap wrap-break-word">
            {error.message ? <code>{error.message}</code> : null}
          </pre>
        </div>
      )}

      <button
        onClick={reset}
        className="cursor-pointer font-['Space_Mono'] text-xs tracking-widest uppercase px-6 py-3 border border-[#22d3ee]/50 text-[#22d3ee] hover:bg-[#22d3ee]/10 hover:border-[#22d3ee] transition-all duration-200"
      >
        {t('errors.tryAgain')}
      </button>
    </div>
  )
}
