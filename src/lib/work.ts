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
  | { type: 'none'; message: string }

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

export async function interpret(command: string, categories: string[]): Promise<{ reply: string; actions: WorkAction[] }> {
  if (!supabase) throw new Error('מסך העבודה זמין אחרי חיבור לשרת.')
  return api<{ reply: string; actions: WorkAction[] }>('interpret', { command, categories }, FN)
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
