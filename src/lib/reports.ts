import { supabase } from './supabase'
import { api } from './api'

// דוח לילי "שדרוג אפליקציות": נכתב ב-04:00 על ידי משימה מתוזמנת, ונקרא כאן בלבד
export type AppStatus = 'ok' | 'unmerged' | 'not_deployed' | 'failed'
export interface AppRow {
  name: string
  repo: string
  live_url: string | null
  status: AppStatus
  done: string
  todo: string | null
  branches?: { name: string; commits: number }[]
}
export interface Report {
  report_date: string
  headline: string
  checked: number
  ok: number
  apps: AppRow[]
  todo: string[]
  created_at: string
}

export const STATUS_TEXT: Record<AppStatus, string> = {
  ok: 'מוזג ונפרס',
  unmerged: 'לא מוזג',
  not_deployed: 'מוזג, לא נפרס',
  failed: 'פריסה נכשלה',
}

export async function listReports(): Promise<Report[]> {
  if (!supabase) return []
  return (await api<{ reports: Report[] }>('list', {}, 'yoman-reports')).reports ?? []
}
