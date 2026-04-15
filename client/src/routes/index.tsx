import { createBrowserRouter, redirect } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { LandingPage } from '@/pages/landing';
import { NotFound } from '@/pages/not-found';
import { GameSetupPage } from '@/pages/game-setup';
import { GamePlayPage } from '@/pages/game-play';
import { GameRoomsPage } from '@/pages/game-rooms';
import { GameSpectatePage } from '@/pages/game-spectate';
import { WaitingRoomPage } from '@/pages/waiting-room';
import { ForumPostLegacyRedirect } from '@/components/forum/ForumPostLegacyRedirect';
import { ForumFeedPage } from '@/pages/forum-feed';
import { LeaderboardPage } from '@/pages/leaderboard';
import { AdminDashboardPage } from '@/pages/admin-dashboard';
import { GameSetupProvider } from '@/store/gameSetupContext';
import i18n from '@/i18n';

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
    path: '/forum',
    element: <ForumFeedPage />,
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
  },
  {
    path: '/admin',
    element: <AdminDashboardPage />,
  },
  {
    path: '/forum/posts/:postId',
    element: <ForumPostLegacyRedirect />,
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
    path: '/game/spectate/:roomId',
    element: <GameSpectatePage />,
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
    path: '/game/bot-setup',
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
    element: (
      <NotFound
        reset={() => {
          throw redirect('/');
        }}
        error={new Error(i18n.t('errors.notFound'))}
      />
    ),
  },
]);
