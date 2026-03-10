import { createBrowserRouter, redirect } from 'react-router-dom'
import { HomePage } from '@/pages/home'
import { WelcomePage } from '@/pages/welcome'
import { NotFound } from '@/pages/not-found'

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
    path: '*',
    element: <NotFound reset={() => { throw redirect('/') }} error={new Error('Page not found')} />,
  },
])
