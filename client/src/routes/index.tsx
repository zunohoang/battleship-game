import { createBrowserRouter, redirect } from 'react-router-dom'
import { HomePage } from '@/pages/home'
import { WelcomePage } from '@/pages/welcome'
import { NotFound } from '@/pages/not-found'
import { GameSetupPage } from '@/pages/game-setup'
import { GameSetupProvider } from '@/store/gameSetupContext'
import i18n from '@/i18n'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <WelcomePage />,
  },
  {
    path: '/home',
    element: <HomePage />,
  },
  {
    path: '/game/setup',
    element: (
      <GameSetupProvider>
        <GameSetupPage />
      </GameSetupProvider>
    ),
  },
  {
    path: '*',
    element: <NotFound reset={() => { throw redirect('/') }} error={new Error(i18n.t('errors.notFound'))} />,
  },
])
