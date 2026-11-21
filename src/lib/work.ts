import { supabase } from './supabase'
import { api } from './api'
import { normalizePhone } from './whatsapp'

// מסך עבודה, אנשי קשר וקישורים חשובים. הכול דרך הפונקציה yoman-work (המפתח של Claude נשאר בשרת)
export interface Contact { name: string; email: string; phone: string }
export interface QLink { name: string; url: string }

export type WorkAction =
  | { type: 'email'; to_name: string; to_email: string; subject: string; body: string }
  | { type: 'event'; title: string; event_date: string; event_time: string | null; location: string | null; people: string[]; description: string | null; category_name: string | null }
  | { type: 'task'; text: string }
  | { type: 'whatsapp'; to_name: string; to_phone: string; text: string }
  | { type: 'contact'; name: string; email: string; phone: string }
  | { type: 'none'; message: string }

// תור בשיחה, כפי שהוא נשלח לשרת כהקשר
export interface Turn { role: 'me' | 'bot'; text: string }

const FN = 'yoman-work'
const LS_CONTACTS = 'sc_contacts_v1'
const LS_LINKS = 'sc_links_v1'
export const DEFAULT_LINKS: QLink[] = [{ name: 'מייל', url: 'https://mail.google.com' }]

const readLS = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d }
}
const writeLS = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* אחסון חסום */ } }

export async function getLinks(): Promise<QLink[]> {
  const l = supabase ? (await api<{ links: QLink[] }>('links_get', {}, FN)).links : readLS<QLink[]>(LS_LINKS, [])
  return l.length ? l : DEFAULT_LINKS
}
export async function saveLinks(l: QLink[]): Promise<void> {
  if (!supabase) return writeLS(LS_LINKS, l)
  await api('links_set', { links: l }, FN)
}

export async function getContacts(): Promise<Contact[]> {
  return supabase ? (await api<{ contacts: Contact[] }>('contacts_get', {}, FN)).contacts : readLS<Contact[]>(LS_CONTACTS, [])
}
export async function saveContacts(c: Contact[]): Promise<void> {
  if (!supabase) return writeLS(LS_CONTACTS, c)
  await api('contacts_set', { contacts: c }, FN)
}

// מיזוג רשימה: מוסיף רק את מי שחסר (לפי כתובת, ובלי כתובת לפי שם), בלי לדרוס קיימים
export async function mergeContacts(list: Contact[]): Promise<{ added: number; total: number }> {
  if (supabase) return api<{ added: number; total: number }>('contacts_merge', { contacts: list }, FN)
  const cur = readLS<Contact[]>(LS_CONTACTS, [])
  const fresh = list.filter((c) => c.name && !cur.some((x) => (c.email ? x.email.toLowerCase() === c.email.toLowerCase() : x.name === c.name)))
  writeLS(LS_CONTACTS, [...cur, ...fresh])
  return { added: fresh.length, total: cur.length + fresh.length }
}

// רשימה מודבקת, בכל צורה: "שם <כתובת>", "שם, כתובת, טלפון", או כתובות בלבד. שורה או פריט לכל איש קשר
export function parseContacts(text: string): Contact[] {
  const out: Contact[] = []
  for (const raw of text.split(/[\n;]+/)) {
    const email = raw.match(/[^\s<>(),;:"']+@[^\s<>(),;:"']+\.[^\s<>(),;:"']+/)?.[0] ?? ''
    const rest = email ? raw.replace(email, ' ') : raw
    const phone = rest.match(/\+?\d[\d\- ]{7,14}\d/)?.[0]?.trim() ?? ''
    const name = (phone ? rest.replace(phone, ' ') : rest).replace(/[<>(),"'\t|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!email && !phone) continue
    out.push({ name: name || email.split('@')[0], email: email.toLowerCase(), phone })
  }
  return out
}

export async function interpret(command: string, categories: string[], history: Turn[] = []): Promise<{ reply: string; actions: WorkAction[]; options: string[] }> {
  if (!supabase) throw new Error('השיחה זמינה אחרי חיבור לשרת.')
  const r = await api<{ reply: string; actions: WorkAction[]; options?: string[] }>('interpret', { command, categories, history }, FN)
  return { ...r, options: r.options ?? [] }
}

// פתיחת חלון כתיבה ב-Gmail, עם כתובת, נושא וגוף מוכנים. אנחנו לא שולחים: ענת בודקת ולוחצת שליחה
export function gmailUrl(to: string, subject: string, body: string): string {
  const q = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body })
  return `https://mail.google.com/mail/?${q.toString()}`
}

// הודעה בווצאפ: wa.me עם הטקסט
export function whatsappUrl(phone: string, text: string): string | null {
  const n = normalizePhone(phone)
  return n ? `https://wa.me/${n.replace('+', '')}?text=${encodeURIComponent(text)}` : null
}
