// עזרי תאריך בעברית. כל התאריכים הם מחרוזות YYYY-MM-DD, בלי המרות אזור זמן

export const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
export const HE_DAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

const pad = (n: number) => String(n).padStart(2, '0')

export const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

export function todayIso(): string {
  const n = new Date()
  return toIso(n.getFullYear(), n.getMonth(), n.getDate())
}

export function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

// תאריך כמספר ימים מאז 1970, לחישוב הפרשים בלי בעיות שעון קיץ
function dayNumber(iso: string): number {
  const { y, m, d } = parseIso(iso)
  return Math.round(Date.UTC(y, m, d) / 86400000)
}

export const daysUntil = (iso: string, from = todayIso()) => dayNumber(iso) - dayNumber(from)

export function addMonths(y: number, m: number, delta: number) {
  const t = y * 12 + m + delta
  return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }
}

export interface DayCell {
  iso: string
  day: number
  inMonth: boolean
}

// גריד חודשי: שבוע מתחיל ביום ראשון, תמיד 6 שורות כדי שהמסגרת לא תזוז
export function monthGrid(y: number, m: number): DayCell[] {
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay()
  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const dt = new Date(Date.UTC(y, m, 1 - first + i))
    const cy = dt.getUTCFullYear()
    const cm = dt.getUTCMonth()
    cells.push({ iso: toIso(cy, cm, dt.getUTCDate()), day: dt.getUTCDate(), inMonth: cy === y && cm === m })
  }
  return cells
}

export function formatLong(iso: string): string {
  const { y, m, d } = parseIso(iso)
  return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, d)))
}

export function formatShort(iso: string): string {
  const { y, m, d } = parseIso(iso)
  return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, d)))
}

export const formatTime = (t: string | null) => (t ? t.slice(0, 5) : '')

// ניסוח יחסי: מחר, בעוד 3 ימים, אתמול
export function relativeDays(iso: string): string {
  const n = daysUntil(iso)
  if (n === 0) return 'היום'
  if (n === 1) return 'מחר'
  if (n === 2) return 'מחרתיים'
  if (n === -1) return 'אתמול'
  if (n > 2) return `בעוד ${n} ימים`
  return `לפני ${-n} ימים`
}

// ---- תצוגות מתגלגלות: "היום" תמיד באמצע ----
export type ViewMode = 'day' | 'week' | 'month' | 'bimonth' | 'quarter'
export const VIEW_LABEL: Record<ViewMode, string> = { day: 'יום', week: 'שבוע', month: 'חודש', bimonth: 'חודשיים', quarter: '3 חודשים' }
// כמה שבועות (שורות) בכל תצוגה. השבוע מתחיל ביום ראשון, ושורת היום תמיד באמצע
export const VIEW_ROWS: Record<ViewMode, number> = { day: 0, week: 1, month: 5, bimonth: 9, quarter: 13 }
export const VIEW_STEP: Record<ViewMode, number> = { day: 1, week: 7, month: 35, bimonth: 63, quarter: 91 }
export const HE_DAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export function addDays(iso: string, n: number): string {
  const { y, m, d } = parseIso(iso)
  const dt = new Date(Date.UTC(y, m, d + n))
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
}

export const weekdayOf = (iso: string) => {
  const { y, m, d } = parseIso(iso)
  return new Date(Date.UTC(y, m, d)).getUTCDay()
}

// כל הימים בחלון. יום: אתמול, היום ומחר. אחרת שבועות שלמים מיום ראשון, כששבוע העוגן (היום) בשורה האמצעית
export function windowDays(anchor: string, mode: ViewMode): string[] {
  if (mode === 'day') return [addDays(anchor, -1), anchor, addDays(anchor, 1)]
  const rows = VIEW_ROWS[mode]
  const start = addDays(addDays(anchor, -weekdayOf(anchor)), -7 * ((rows - 1) / 2))
  return Array.from({ length: rows * 7 }, (_, i) => addDays(start, i))
}

// טווח לכותרת: "9 עד 15 בנובמבר 2026" או "29 באוקטובר עד 4 בנובמבר 2026"
export function formatRange(a: string, b: string): string {
  const x = parseIso(a)
  const z = parseIso(b)
  if (x.y === z.y && x.m === z.m) return `${x.d} עד ${z.d} ב${HE_MONTHS[z.m]} ${z.y}`
  if (x.y === z.y) return `${x.d} ב${HE_MONTHS[x.m]} עד ${z.d} ב${HE_MONTHS[z.m]} ${z.y}`
  return `${x.d} ב${HE_MONTHS[x.m]} ${x.y} עד ${z.d} ב${HE_MONTHS[z.m]} ${z.y}`
}

// מתי נרשמה משימה: יום, תאריך ושעה לפי שעון ישראל
export function formatCreated(iso: string): string {
  const d = new Date(iso)
  if (!iso || isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }).format(d)
}
