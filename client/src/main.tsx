import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './i18n'
import { GlobalProvider } from '@/store/globalContext'
import { SettingsProvider } from '@/store/settingsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <GlobalProvider>
        <App />
      </GlobalProvider>
    </SettingsProvider>
  </StrictMode>,
)
