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
  handled: string[] // ריפו שסומנו כטופלו
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
  return ((await api<{ reports: Report[] }>('list', {}, 'yoman-reports')).reports ?? []).map((r) => ({ ...r, handled: r.handled ?? [] }))
}

// סימון "טופל" לאפליקציה בדוח של יום מסוים. נשמר בשרת
export async function setHandled(report_date: string, repo: string, on: boolean): Promise<string[]> {
  return (await api<{ handled: string[] }>('handle', { report_date, repo, on }, 'yoman-reports')).handled
}

// ההנחיה לשיחת Claude חדשה על הריפו של האפליקציה: מה נעשה, מה חסר, ומה מצופה בסוף
export function continuePrompt(a: AppRow, report_date: string): string {
  const lines = [
    `המשך טיפול באפליקציה "${a.name}".`,
    `ריפו: ${a.repo}`,
    a.live_url ? `כתובת חיה: ${a.live_url}` : '',
    `מצב לפי הדוח הלילי של ${report_date.split('-').reverse().join('.')}: ${STATUS_TEXT[a.status]}.`,
    '',
    `מה נעשה: ${a.done}`,
    a.todo ? `מה חסר: ${a.todo}` : '',
    a.branches?.length ? `ענפים פתוחים: ${a.branches.map((b) => `${b.name} (${b.commits} קומיטים)`).join(', ')}` : '',
    '',
    'מה אני מבקשת:',
    '1. בדוק קודם את המצב בפועל בריפו ובפריסה, כי הדוח נכתב בלילה.',
    '2. טפל במה שחסר.',
    '3. בדוק בעין במחשב ובנייד, מזג ל-main ופרוס.',
    '4. סיים בכתובת חיה ובשורה אחת: מה נסגר ומה נשאר.',
  ]
  return lines.filter((l, i) => l !== '' || (lines[i - 1] !== '' && i > 0)).join('\n')
}
