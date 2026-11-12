import { createContext, useContext } from 'react'
import type { useEvents } from '../hooks/useEvents'
import type { useCategories } from '../hooks/useCategories'
import type { useQuickLinks } from '../hooks/useQuickLinks'
import type { useProjects } from '../hooks/useProjects'
import type { EventDraft } from '../types'

// הקשר משותף: האירועים ופעולות ההעלאה שתפריט ה-AI ודף הבית משתמשים בהן
export interface AppCtx {
  ev: ReturnType<typeof useEvents>
  cats: ReturnType<typeof useCategories>
  links: ReturnType<typeof useQuickLinks>
  projects: ReturnType<typeof useProjects>
  reviewDraft: (d: EventDraft) => void
  pickFile: () => void
  openPaste: () => void
  newManual: (date?: string, time?: string) => void
  openVoice: () => void
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
