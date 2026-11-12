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
