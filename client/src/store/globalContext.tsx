import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { clearAccessToken } from '@/services/authToken'
import { setForceLogoutCallback } from '@/services/interceptors'

const AUTH_USER_STORAGE_KEY = 'auth.user'

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

const isGlobalUser = (value: unknown): value is GlobalUser => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  const { username, avatar, signature } = candidate

  return (
    typeof username === 'string' &&
    (typeof avatar === 'string' || avatar === null) &&
    (typeof signature === 'string' || signature === null)
  )
}

const loadStoredUser = (): GlobalUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return isGlobalUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

const saveStoredUser = (user: GlobalUser | null): void => {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY)
      return
    }

    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
  } catch {
    // Ignore storage errors and keep auth state in memory.
  }
}

export function GlobalProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const [user, setUserState] = useState<GlobalUser | null>(() => loadStoredUser())
  const [isSessionExpiredModalOpen, setSessionExpiredModalOpen] = useState(false)

  useEffect(() => {
    saveStoredUser(user)
  }, [user])

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
        <div className='mt-4'>
          <Button variant='primary' onClick={redirectToWelcome}>
            {t('errors.goHome')}
          </Button>
        </div>
      </Modal>
    </GlobalContext.Provider>
  )
}
