import { createBrowserRouter, redirect } from 'react-router-dom'
import { HomePage } from '@/pages/home'
import { LandingPage } from '@/pages/landing'
import { NotFound } from '@/pages/not-found'
import { GameSetupPage } from '@/pages/game-setup'
import { GamePlayPage } from '@/pages/game-play'
import { GameRoomsPage } from '@/pages/game-rooms'
import { WaitingRoomPage } from '@/pages/waiting-room'
import { GameSetupProvider } from '@/store/gameSetupContext'
import i18n from '@/i18n'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/home',
    element: <HomePage />,
  },
  {
    path: '/game/rooms',
    element: <GameRoomsPage />,
  },
  {
    path: '/game/waiting',
    element: <WaitingRoomPage />,
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
    path: '/game/play',
    element: <GamePlayPage />,
  },
  {
    path: '*',
    element: <NotFound reset={() => { throw redirect('/') }} error={new Error(i18n.t('errors.notFound'))} />,
  },
])
