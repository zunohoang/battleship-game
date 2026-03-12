import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
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
  const [user, setUserState] = useState<GlobalUser | null>(null)

  const logout = useCallback(() => {
    clearAccessToken()
    setUserState(null)
  }, [])

  useEffect(() => {
    setForceLogoutCallback(logout)
  }, [logout])

  return (
    <GlobalContext.Provider value={{ user, isLoggedIn: user !== null, setUser: setUserState, logout }}>
      {children}
    </GlobalContext.Provider>
  )
}
