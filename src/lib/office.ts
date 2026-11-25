import { api, APPROVER_LS } from './api'

// המשרד: תור העבודה, ההרשאות, תדריך הבוקר וסגירת הערב. כל הנתונים מגיעים מהפונקציה yoman-office
export type JobStatus = 'proposed' | 'queued' | 'running' | 'done' | 'failed' | 'rejected' | 'canceled'
export type Executor = 'server' | 'claude_code' | 'anat'
export interface Job {
  id: string
  kind: string
  level: 1 | 2 | 3
  executor: Executor
  status: JobStatus
  title: string
  found: string | null
  why: string | null
  solution: string | null
  value: string | null
  risks: string | null
  app_name: string | null
  repo: string | null
  branch: string | null
  workdir: string | null
  live_url: string | null
  depends_on: string[] | null
  prompt: string | null
  payload: { session?: string | null; suggested_repo?: string | null; branches?: { name: string; commits: number }[]; report_date?: string } & Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  score: number
  source: 'system' | 'night_report' | 'anat' | 'evening'
  attempts: number
  max_attempts: number
  run_after: string
  decided_at: string | null
  decided_note: string | null
  tokens: number
  created_at: string
  updated_at: string
  finished_at: string | null
}
export interface Policy { kind: string; level: 1 | 2 | 3; auto: boolean; executor: 'server' | 'claude_code'; label: string; description: string; minutes_saved: number; locked: boolean }
export interface Budget { daily_tokens: number; night_sessions: number; night_deploys: number; reserve_deploys: number }
export interface Run { id: number; job_id: string | null; kind: string; worker: string; ok: boolean; summary: string; tokens: number; model: string | null; finished_at: string }
export interface DayRow {
  day: string
  intent: string | null
  evening: { story: string; done_tasks: string[]; office_done: string[]; events: string[]; open: { title: string; why: string | null }[]; tomorrow: string[]; open_tasks: number; note: string | null; learned: string | null } | null
  night_plan: { jobs: { id: string; title: string; repo: string | null; kind: string }[]; deferred: { id: string; title: string; repo: string | null; why: string }[]; server: string[]; budget: { sessions: number; deploys: number; reserve: number } } | null
  night_result: { summary?: string; jobs?: { id: string; ok: boolean; summary: string; url?: string }[] } | null
  closed_at: string | null
}
export interface Overview {
  day: string
  since: string
  today: DayRow | null
  yesterday: DayRow | null
  progressed: { code: Pick<Job, 'id' | 'title' | 'app_name' | 'repo' | 'live_url' | 'result' | 'finished_at' | 'kind'>[]; routine: { kind: string; label: string; summary: string; at: string }[] }
  team: Job[]
  decisions: Job[]
  failed: Job[]
  stale: { projects: { id: string; name: string; days: number; next_step: string | null }[]; tasks: { id: string; text: string; days: number }[] } | null
  health: { checked: number; ok: number; down: { app_name: string; url: string; status: number; fail_streak: number }[]; last: string }
  metrics: { auto_actions: number; minutes_saved: number; failures: number; tokens_week: number; tokens_today: number; usd_week: number; upgrades_done: number; decisions_pending: number }
  policies: Policy[]
  budget: Budget
  approver: boolean
}
export interface Rule { id: string; text: string; scope: 'decision' | 'principle'; status: 'proposed' | 'active' | 'archived'; source: string | null; created_at: string }
export interface RegApp { name: string; repo: string; url: string | null }

const call = <T>(action: string, payload: Record<string, unknown> = {}) => api<T>(action, payload, 'yoman-office')

export const getOverview = () => call<Overview>('overview')
export const listJobs = (status?: JobStatus[]) => call<{ jobs: Job[]; runs: Run[] }>('jobs', status ? { status } : {})
export const listApps = async () => (await call<{ apps: RegApp[] }>('apps')).apps
export const decide = (id: string, verdict: 'approve' | 'reject', note?: string) => call<{ job: Job }>('decide', { id, verdict, note })
export const cancelJob = (id: string) => call<{ job: Job }>('cancel', { id })
export const retryJob = (id: string) => call<{ job: Job }>('retry', { id })
export const runNow = () => call<{ done?: { kind: string; ok: boolean; summary: string }[]; skipped?: string }>('run_now')
export const requestWork = (repo: string, text: string) => call<{ job: Job }>('request', { repo, text })
export const setPolicy = (kind: string, auto: boolean) => call<{ policy: Policy }>('set_policy', { kind, auto })
export const setBudget = (budget: Partial<Budget>) => call<{ budget: Budget }>('set_budget', { budget })
export const getDay = () => call<{ day: string; row: DayRow | null; queued: Job[]; budget: Budget }>('day')
export const setIntent = (intent: string) => call('set_intent', { intent })
export const closeDay = (note: string, learned: string) => call<{ summary: string; row: DayRow }>('close_day', { note, learned })
export const listRules = async () => (await call<{ rules: Rule[] }>('rules')).rules
export const addRule = (text: string, scope: Rule['scope']) => call<{ rule: Rule }>('add_rule', { text, scope })
export const ruleStatus = (id: string, patch: { status?: Rule['status']; scope?: Rule['scope'] }) => call<{ rule: Rule }>('rule_status', { id, ...patch })
export const restoreRemoved = (history_id: number) => call('restore', { history_id })

// מפתח האישור: נשמר בדפדפן הזה בלבד, ונבדק בשרת לפני שנשמר
export const hasApprover = () => { try { return !!localStorage.getItem(APPROVER_LS) } catch { return false } }
export async function saveApprover(key: string): Promise<boolean> {
  try { localStorage.setItem(APPROVER_LS, key.trim()) } catch { return false }
  const ok = (await call<{ approver: boolean }>('whoami').catch(() => ({ approver: false }))).approver
  if (!ok) try { localStorage.removeItem(APPROVER_LS) } catch { /* אחסון חסום */ }
  return ok
}
export const forgetApprover = () => { try { localStorage.removeItem(APPROVER_LS) } catch { /* אחסון חסום */ } }

export const LEVEL_TEXT: Record<1 | 2 | 3, string> = { 1: 'שגרה', 2: 'שדרוג במדיניות', 3: 'החלטה שלך' }
export const STATUS_TEXT: Record<JobStatus, string> = {
  proposed: 'מחכה להחלטה', queued: 'בתור', running: 'רץ עכשיו', done: 'הושלם', failed: 'נכשל', rejected: 'נדחה', canceled: 'בוטל',
}
export const EXEC_TEXT: Record<Executor, string> = { server: 'משמרת השרת', claude_code: 'משמרת הלילה ב-Claude Code', anat: 'את' }

// פתיחה לביצוע ב-Claude Code, בלי סיכוי לריפו הלא נכון:
// 1. יש שיחה שנוצרה מראש על הריפו (מהדוח הלילי): נפתחת היא, והפרומפט מועתק.
// 2. אין: הפרומפט מועתק, ובראשו בדיקת סף שעוצרת אם השיחה פתוחה בריפו אחר. ממשק הבחירה מציג את שם הריפו בגדול.
export async function copyPrompt(j: Job): Promise<boolean> {
  if (!j.prompt) return false
  try { await navigator.clipboard.writeText(j.prompt); return true } catch { return false }
}
export const CLAUDE_CODE = 'https://claude.ai/code'

// "חזרה לתוכנית העבודה": נשמר כשיוצאים מהמשרד למסך אחר
const LS_RETURN = 'yoman_office_return'
export const markReturn = (label: string) => { try { sessionStorage.setItem(LS_RETURN, label) } catch { /* אחסון חסום */ } }
export const readReturn = () => { try { return sessionStorage.getItem(LS_RETURN) } catch { return null } }
export const clearReturn = () => { try { sessionStorage.removeItem(LS_RETURN) } catch { /* אחסון חסום */ } }

export const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
export const dmy = (iso: string) => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' })
