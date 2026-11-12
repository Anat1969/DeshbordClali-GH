import type { CalEvent, Task } from '../types'
import type { Project } from './projects'
import { addDays, daysUntil, formatTime } from './dateUtils'
import { dayKey } from './inspire'

// תדרוך בוקר: צורת היום, שלושה פרקים, מה דורש תשומת לב, ומה כבר סגור.
// הכול מחושב מהנתונים שביומן, בלי לנחש. הנימה: מתארים ומוסרים, בלי פקודות ובלי התנצלויות
export type DayType = 'heavy' | 'normal' | 'open'
export interface BriefItem { title: string; text: string; to?: string }
export interface Dot { t: number; title: string; overlap: boolean }
export interface Brief {
  dayType: DayType
  headline: string
  dots: Dot[]
  free: { from: number; to: number } | null
  acts: { range: string; text: string }[]
  needs: BriefItem[]
  resolved: BriefItem[]
}

const EVENT_HOURS = 1 // אין שעת סיום באירועים, ולכן מניחים שעה לכל אירוע

const toH = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h + (m || 0) / 60
}
export const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

// עומס בשעה נתונה: כמה אירועים פעילים
export const loadAt = (dots: Dot[], h: number) => dots.filter((d) => d.t <= h && h < d.t + EVENT_HOURS).length

function longestFree(dots: Dot[]): { from: number; to: number } | null {
  const busy = dots.map((d) => [d.t, d.t + EVENT_HOURS] as const).sort((a, b) => a[0] - b[0])
  let best: { from: number; to: number } | null = null
  let cur = 8
  const consider = (to: number) => {
    if (to - cur >= 1.5 && (!best || to - cur > best.to - best.from)) best = { from: cur, to }
  }
  for (const [s, e] of busy) {
    if (s > cur) consider(Math.min(s, 20))
    cur = Math.max(cur, e)
  }
  if (cur < 20) consider(20)
  return best
}

function ago(iso: string, today: string): string {
  const d = daysUntil(today, dayKey(iso))
  return d <= 0 ? 'היום' : d === 1 ? 'אתמול' : `לפני ${d} ימים`
}

export function buildBrief(o: { events: CalEvent[]; tasks: Task[]; projects: Project[]; today: string; name: string }): Brief {
  const { events, tasks, projects, today, name } = o
  const tomorrow = addDays(today, 1)
  const yesterday = addDays(today, -1)

  const todays = events.filter((e) => e.event_date === today)
  const timed = todays.filter((e) => e.event_time).sort((a, b) => (a.event_time! < b.event_time! ? -1 : 1))
  const untimed = todays.filter((e) => !e.event_time)
  const dots: Dot[] = timed.map((e, i, arr) => ({ t: toH(e.event_time!), title: e.title, overlap: arr.some((x, j) => j !== i && Math.abs(toH(x.event_time!) - toH(e.event_time!)) < 0.5) }))
  const n = todays.length
  const free = longestFree(dots)

  // סיווג היום: עמוס, רגיל או פנוי
  const cluster = dots.some((d, i) => dots.filter((x, j) => j >= i && x.t - d.t <= 4).length >= 3)
  const dayType: DayType = n >= 4 || cluster ? 'heavy' : n <= 1 ? 'open' : 'normal'
  const win = free ? `${hhmm(free.from)} עד ${hhmm(free.to)}` : ''
  const headline =
    dayType === 'open'
      ? n === 0 ? `היום פנוי לגמרי, ${name}. אפשר להקדיש אותו למה שמחכה.` : `אירוע אחד היום, ${name}, והשאר שלך.`
      : dayType === 'normal'
        ? `אירועים מפוזרים לאורך היום, ${name}.${win ? ` החלון הפנוי הארוך: ${win}.` : ''}`
        : `יום עמוס, ${n} אירועים, ${name}.${win ? ` בין ${win} יש מקום לנשום.` : ''}`

  // שלושה פרקים: בוקר, צהריים, ערב. משפט אחד מתוך הנתונים בכל פרק
  const part = (from: number, to: number) => timed.filter((e) => toH(e.event_time!) >= from && toH(e.event_time!) < to)
  const sentence = (list: CalEvent[], extra: CalEvent[] = []) => {
    const all = [...list.map((e) => `${formatTime(e.event_time)} ${e.title}`), ...extra.map((e) => `בלי שעה: ${e.title}`)]
    return all.length === 0 ? 'ללא אירועים.' : all.length === 1 ? `${all[0]}.` : `${all.length} אירועים: ${all.join('; ')}.`
  }
  const acts = [
    { range: 'עד 12:00', text: sentence(part(0, 12), untimed) },
    { range: '12:00 – 17:00', text: sentence(part(12, 17)) },
    { range: '17:00 ואילך', text: sentence(part(17, 25)) },
  ]

  // מה דורש תשומת לב: איחורים בפרויקטים, הכנה למחר, מועדים קרובים, משימות פתוחות, פרויקטים שנתקעו
  const active = projects.filter((p) => p.status !== 'done')
  const pText = (p: Project) => `במעקב פרויקטים: ${p.progress}% הושלמו. ${p.next_step ? `הצעד הבא: ${p.next_step}.` : 'אין צעד הבא מוגדר.'}`
  const needs: BriefItem[] = []
  for (const p of active.filter((x) => x.due_date && daysUntil(x.due_date, today) < 0)) needs.push({ title: `${p.name}: באיחור של ${-daysUntil(p.due_date!, today)} ימים`, text: pText(p), to: '/projects' })
  for (const e of events.filter((x) => x.event_date === tomorrow).sort((a, b) => (a.event_time ?? '') < (b.event_time ?? '') ? -1 : 1))
    needs.push({ title: `מחר: ${e.title}`, text: `ביומן: ${e.event_time ? formatTime(e.event_time) : 'בלי שעה'}${e.location ? `, ${e.location}` : ''}${e.people.length ? `, עם ${e.people.join(', ')}` : ''}.`, to: '/' })
  for (const p of active.filter((x) => x.due_date && daysUntil(x.due_date, today) >= 0 && daysUntil(x.due_date, today) <= 7)) {
    const d = daysUntil(p.due_date!, today)
    needs.push({ title: `${p.name}: ${d === 0 ? 'המועד היום' : `בעוד ${d} ימים`}`, text: pText(p), to: '/projects' })
  }
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  for (const t of open.slice(0, 4)) needs.push({ title: t.text, text: `במשימות: נרשמה ${ago(t.created_at, today)}${t.note ? `. הערה: ${t.note}` : ''}.`, to: '/' })
  if (open.length > 4) needs.push({ title: `ועוד ${open.length - 4} משימות פתוחות`, text: 'ברשימת המשימות ביומן.', to: '/' })
  const stalled = active.filter((x) => x.status === 'active' && Date.now() - new Date(x.updated_at).getTime() >= 7 * 86400000 && !(x.due_date && daysUntil(x.due_date, today) <= 7)).slice(0, 2)
  for (const p of stalled) needs.push({ title: `${p.name}: לא עודכן שבוע`, text: pText(p), to: '/projects' })

  // מה כבר סגור: משימות שבוצעו אתמול, ופרויקטים שהושלמו לאחרונה
  const resolved: BriefItem[] = []
  for (const t of tasks.filter((x) => x.done && x.done_at && dayKey(x.done_at) === yesterday)) {
    const when = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }).format(new Date(t.done_at!))
    resolved.push({ title: t.text, text: `במשימות: סומנה כבוצעה אתמול ב-${when}.` })
  }
  for (const p of projects.filter((x) => x.status === 'done' && Date.now() - new Date(x.updated_at).getTime() < 3 * 86400000))
    resolved.push({ title: `${p.name}: הושלם`, text: `במעקב פרויקטים: סומן כהושלם ${ago(p.updated_at, today)}.`, to: '/projects' })

  return { dayType, headline, dots, free, acts, needs: needs.slice(0, 9), resolved }
}
