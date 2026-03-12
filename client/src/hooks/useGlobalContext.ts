import { useContext } from 'react'
import { GlobalContext } from '@/store/globalContext'
import type { GlobalContextValue } from '@/store/globalContext'

export function useGlobalContext(): GlobalContextValue {
  const ctx = useContext(GlobalContext)
  if (!ctx) throw new Error('useGlobalContext must be used within GlobalProvider')
  return ctx
}
