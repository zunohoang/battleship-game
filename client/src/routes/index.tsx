import { createBrowserRouter, redirect } from 'react-router-dom'
import { HomePage } from '@/pages/home'
import { NotFound } from '@/pages/not-found'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '*',
    element: <NotFound reset={() => { throw redirect('/') }} error={new Error('Page not found')} />,
  },
])
