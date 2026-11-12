import { supabase } from './supabase'
import { api } from './api'

// כרטיס השראה מהאפליקציות האחרות. הבחירה קבועה לכל היום (השרת בוחר לפי התאריך)
export interface InspireCard {
  id: string
  kind: 'power' | 'insight' | 'train' | 'exercise' | 'news' | 'song' | 'distilled' | 'word'
  label: string
  title?: string
  text: string
  hint?: string
  meta?: string
  source: string
  url?: string
  options?: string[]
  correct?: number
  explanation?: string
}

const LS_CACHE = 'yoman_inspire_v1'
const LS_SEEN = 'yoman_welcome_day_v1'

// התאריך המקומי בישראל, YYYY-MM-DD
export const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())

export const seenToday = () => {
  try { return localStorage.getItem(LS_SEEN) === dayKey() } catch { return true }
}
export const markSeen = () => {
  try { localStorage.setItem(LS_SEEN, dayKey()) } catch { /* אחסון חסום */ }
}

// דוגמאות למצב הדגמה, כשאין חיבור לשרת
const DEMO: InspireCard[] = [
  { id: 'power', kind: 'power', label: 'משפט העצמה', title: 'דוגמה', text: 'מי שיודע להתגעגע נכון, יודע גם לחיות נכון.', source: 'הדגמה' },
  { id: 'exercise', kind: 'exercise', label: 'תרגיל להיום', text: 'הקדישי חמש דקות להתבוננות בחלון, בלי טלפון.', source: 'הדגמה' },
]

export async function getInspiration(): Promise<InspireCard[]> {
  if (!supabase) return DEMO
  try {
    const c = JSON.parse(localStorage.getItem(LS_CACHE) ?? 'null') as { date: string; cards: InspireCard[] } | null
    if (c && c.date === dayKey() && c.cards.length) return c.cards
  } catch { /* מטמון פגום: טוענים מחדש */ }
  const { date, cards } = await api<{ date: string; cards: InspireCard[] }>('inspire', {}, 'yoman-inspire')
  try { localStorage.setItem(LS_CACHE, JSON.stringify({ date, cards })) } catch { /* אחסון חסום */ }
  return cards
}
