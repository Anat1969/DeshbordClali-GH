import { createContext, useContext } from 'react'
import type { useEvents } from '../hooks/useEvents'

// הקשר משותף: האירועים ופעולות ההעלאה שתפריט ה-AI ודף הבית משתמשים בהן
export interface AppCtx {
  ev: ReturnType<typeof useEvents>
  pickFile: () => void
  openPaste: () => void
  newManual: () => void
  fromFile: (f: File) => void
  signOut: () => void
  account: string | null
  toast: (msg: string) => void
}

export const Ctx = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('חסר AppCtx')
  return c
}
