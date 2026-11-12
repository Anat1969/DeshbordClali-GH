import { supabase } from './supabase'
import { api, ApiError } from './api'

// נוסח התזכורת. אותו נוסח משמש את ה-Edge Function (supabase/functions/yoman-reminder)
export function buildReminderText(e: { title: string; event_time: string | null; location: string | null; people: string[] }): string {
  const time = e.event_time ? ` בשעה ${e.event_time.slice(0, 5)}` : ''
  const loc = e.location ? `\nמיקום: ${e.location}` : ''
  const ppl = e.people.length ? `\nעם: ${e.people.join(', ')}` : ''
  return `מחר: ${e.title}${time}${loc}${ppl}`
}

// מספר ישראלי: מקבל 05X, 972 או +972 ומחזיר +972XXXXXXXXX
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '')
  const m = digits.match(/^(?:\+?972|0)(5\d{8})$/)
  return m ? `+972${m[1]}` : null
}

// שליחת הודעת בדיקה דרך Edge Function (הסודות של Twilio נשארים בשרת)
export async function sendTestMessage(number: string): Promise<void> {
  if (!supabase) throw new Error('שליחה זמינה אחרי חיבור Supabase ו-Twilio.')
  try {
    await api('test_send', { to: number })
  } catch (e) {
    if (e instanceof ApiError && e.code === 'twilio_not_configured') throw new Error('Twilio עוד לא מוגדר בשרת.')
    throw new Error('השליחה נכשלה. כדאי לבדוק שהמספר הצטרף ל-sandbox של Twilio.')
  }
}
