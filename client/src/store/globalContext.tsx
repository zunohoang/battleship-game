import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { clearAccessToken } from '@/services/authToken'
import { setForceLogoutCallback } from '@/services/interceptors'

export interface GlobalUser {
  username: string
  avatar: string | null
  signature: string | null
}

export interface GlobalContextValue {
  user: GlobalUser | null
  isLoggedIn: boolean
  setUser: (user: GlobalUser | null) => void
  logout: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const GlobalContext = createContext<GlobalContextValue | null>(null)

export function GlobalProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const [user, setUserState] = useState<GlobalUser | null>(null)
  const [isSessionExpiredModalOpen, setSessionExpiredModalOpen] = useState(false)

  const logout = useCallback(() => {
    clearAccessToken()
    setUserState(null)
  }, [])

  const redirectToWelcome = useCallback(() => {
    window.location.assign('/')
  }, [])

  const handleForceLogout = useCallback(
    (reasonCode?: string) => {
      if (reasonCode === 'INVALID_REFRESH_TOKEN') {
        setSessionExpiredModalOpen(true)
        return
      }

      logout()
    },
    [logout],
  )

  useEffect(() => {
    setForceLogoutCallback(handleForceLogout)
  }, [handleForceLogout])

  return (
    <GlobalContext.Provider value={{ user, isLoggedIn: user !== null, setUser: setUserState, logout }}>
      {children}
      <Modal
        isOpen={isSessionExpiredModalOpen}
        title={t('errors.SESSION_EXPIRED_TITLE')}
        onClose={redirectToWelcome}
      >
        <div className="mt-4">
          <Button variant="primary" onClick={redirectToWelcome}>
            {t('errors.goHome')}
          </Button>
        </div>
      </Modal>
    </GlobalContext.Provider>
  )
}
