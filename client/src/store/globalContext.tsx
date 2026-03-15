/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { clearAccessToken, getAccessTokenUserId } from '@/services/authToken'
import { setForceLogoutCallback } from '@/services/interceptors'

const AUTH_USER_STORAGE_KEY = 'auth.user'

export interface GlobalUser {
  id: string | null
  username: string
  avatar: string | null
  signature: string | null
  isAnonymous: boolean
}

export const ANONYMOUS_USER: GlobalUser = {
  id: null,
  username: 'Alpha',
  avatar: null,
  signature: '- - -',
  isAnonymous: true,
}

export interface GlobalContextValue {
  user: GlobalUser | null
  isLoggedIn: boolean
  setUser: (user: GlobalUser | null) => void
  logout: () => void
}

export const GlobalContext = createContext<GlobalContextValue | null>(null)

const isGlobalUser = (value: unknown): value is GlobalUser => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  const { id, username, avatar, signature, isAnonymous } = candidate

  return (
    (typeof id === 'string' || id === null) &&
    typeof username === 'string' &&
    (typeof avatar === 'string' || avatar === null) &&
    (typeof signature === 'string' || signature === null) &&
    typeof isAnonymous === 'boolean'
  )
}

const normalizeStoredUser = (value: unknown): GlobalUser | null => {
  if (isGlobalUser(value)) {
    return value
  }

  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const { id, username, avatar, signature } = candidate

  if (
    (typeof id !== 'string' && id !== null && typeof id !== 'undefined') ||
    typeof username !== 'string' ||
    (typeof avatar !== 'string' && avatar !== null) ||
    (typeof signature !== 'string' && signature !== null)
  ) {
    return null
  }

  return {
    id: typeof id === 'string' ? id : getAccessTokenUserId(),
    username,
    avatar,
    signature,
    isAnonymous: false,
  }
}

const loadStoredUser = (): GlobalUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return normalizeStoredUser(parsed)
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
    <GlobalContext.Provider
      value={{
        user,
        isLoggedIn: user !== null && !user.isAnonymous,
        setUser: setUserState,
        logout,
      }}
    >
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
