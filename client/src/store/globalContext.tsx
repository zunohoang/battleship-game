import { createContext, useState, type ReactNode } from 'react'

export interface GlobalUser {
  username: string
  avatarSrc: string
  signature: string | null
}

export interface GlobalContextValue {
  user: GlobalUser | null
  isLoggedIn: boolean
  setUser: (user: GlobalUser | null) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const GlobalContext = createContext<GlobalContextValue | null>(null)

export function GlobalProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<GlobalUser | null>(null)

  return (
    <GlobalContext.Provider value={{ user, isLoggedIn: user !== null, setUser: setUserState }}>
      {children}
    </GlobalContext.Provider>
  )
}
