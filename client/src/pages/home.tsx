import { useTranslation } from 'react-i18next'

export function HomePage() {
  const { t } = useTranslation('common')

  return (
    <main className='min-h-screen flex flex-col items-center justify-center bg-(--bg-main) text-(--text-main) px-6'>
      <h1 className='text-4xl font-bold'>{t('home.title')}</h1>
      <p className='mt-3 text-(--text-muted)'>{t('home.description')}</p>
    </main>
  )
}
