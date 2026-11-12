import { supabase } from './supabase'
import type { EventDraft } from '../types'
import { emptyDraft } from '../types'

// חילוץ פרטי אירוע ממסמך. המפתח של Claude נשמר רק בשרת (Edge Function extract-event),
// כדי שלא ייחשף בדפדפן
export interface ExtractInput {
  text?: string
  file?: File
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024
const TEXT_TYPES = /^(text\/|message\/rfc822)/
const TEXT_EXT = /\.(txt|eml|md|csv|ics)$/i

export const isTextFile = (f: File) => TEXT_TYPES.test(f.type) || TEXT_EXT.test(f.name)
export const isBinarySupported = (f: File) => f.type === 'application/pdf' || /^image\/(png|jpe?g|webp|gif)$/.test(f.type)

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('קריאת הקובץ נכשלה'))
    r.readAsDataURL(file)
  })
}

export async function extractEvent(input: ExtractInput): Promise<EventDraft> {
  let text = input.text
  const file = input.file

  if (file) {
    if (file.size > MAX_FILE_BYTES) throw new Error('הקובץ גדול מ-10MB. אפשר לצמצם אותו או להדביק את הטקסט.')
    if (isTextFile(file)) text = await file.text()
    else if (!isBinarySupported(file)) throw new Error('סוג הקובץ לא נתמך. אפשר PDF, תמונה, טקסט או אימייל (eml).')
  }

  // מצב הדגמה: אין שרת, לכן פענוח פשוט של טקסט בלבד
  if (!supabase) {
    if (file && !text) throw new Error('במצב הדגמה נתמך טקסט בלבד. PDF ותמונה יעבדו אחרי חיבור Supabase.')
    return { ...localParse(text ?? ''), raw_source: (text ?? '').slice(0, 4000) }
  }

  const body = text ? { text: text.slice(0, 30000) } : { mime: file!.type, data: await toBase64(file!) }
  const { data, error } = await supabase.functions.invoke('extract-event', { body })
  if (error) throw new Error('החילוץ נכשל. אפשר לנסות שוב או למלא ידנית.')
  const d = data as Partial<EventDraft> & { raw_source?: string }
  return {
    ...emptyDraft(),
    title: d.title ?? '',
    event_date: /^\d{4}-\d{2}-\d{2}$/.test(d.event_date ?? '') ? d.event_date! : null,
    event_time: /^\d{2}:\d{2}$/.test(d.event_time ?? '') ? d.event_time! : null,
    location: d.location ?? null,
    people: Array.isArray(d.people) ? d.people : [],
    description: d.description ?? null,
    raw_source: d.raw_source ?? text?.slice(0, 4000) ?? null,
  }
}

// פענוח מקומי להדגמה: תאריך dd/mm/yyyy, שעה hh:mm, "מיקום:" ו"משתתפים:"
function localParse(text: string): EventDraft {
  const d = emptyDraft()
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  d.title = (lines[0] ?? '').replace(/^(נושא|כותרת)\s*[:\-]\s*/, '').slice(0, 80)
  const date = text.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/)
  if (date) {
    const y = date[3].length === 2 ? 2000 + Number(date[3]) : Number(date[3])
    d.event_date = `${y}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}`
  }
  const time = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (time) d.event_time = `${time[1].padStart(2, '0')}:${time[2]}`
  const loc = text.match(/(?:מיקום|במקום|כתובת)\s*[:\-]\s*(.+)/)
  if (loc) d.location = loc[1].trim()
  const ppl = text.match(/(?:משתתפים|נוכחים|אנשים)\s*[:\-]\s*(.+)/)
  if (ppl) d.people = ppl[1].split(/[,،]|\sו(?=[א-ת])/).map((s) => s.trim()).filter(Boolean)
  d.description = lines.slice(1, 4).join(' ').slice(0, 200) || null
  return d
}
