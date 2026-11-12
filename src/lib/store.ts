import { supabase, demoMode } from './supabase'
import type { CalEvent, EventDraft, Profile } from '../types'
import { toIso } from './dateUtils'

// שכבת נתונים אחת: Supabase כשהוא מחובר, ואחרת localStorage (מצב הדגמה)
const LS_EVENTS = 'sc_events_v1'
const LS_PROFILE = 'sc_profile_v1'

const COLS = 'id,user_id,title,event_date,event_time,location,people,description,raw_source,source_file_url,source_file_name,reminder_sent,created_at,updated_at'

const normalize = (e: CalEvent): CalEvent => ({
  ...e,
  event_time: e.event_time ? e.event_time.slice(0, 5) : null,
  people: e.people ?? [],
})

function readLocal(): CalEvent[] {
  try {
    const raw = localStorage.getItem(LS_EVENTS)
    if (raw) return JSON.parse(raw) as CalEvent[]
  } catch { /* אחסון חסום: ממשיכים בלי */ }
  return seedDemo()
}

function writeLocal(list: CalEvent[]) {
  try { localStorage.setItem(LS_EVENTS, JSON.stringify(list)) } catch { /* אחסון חסום */ }
}

// נתוני הדגמה יחסיים להיום, כדי שהלוח לא יהיה ריק בפעם הראשונה
function seedDemo(): CalEvent[] {
  const now = new Date()
  const at = (days: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
    return toIso(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const base = { user_id: null, raw_source: null, source_file_url: null, source_file_name: null, reminder_sent: false, created_at: now.toISOString(), updated_at: now.toISOString() }
  const list: CalEvent[] = [
    { ...base, id: 'demo-1', title: 'פגישת תיאום תכנון', event_date: at(1), event_time: '10:30', location: 'משרדי העירייה, קומה 3', people: ['דנה כהן', 'יוסי לוי'], description: 'סיכום הערות לתוכנית המפורטת.' },
    { ...base, id: 'demo-2', title: 'ועדת היגוי', event_date: at(4), event_time: '16:00', location: 'זום', people: ['רונית אברהם'], description: null },
    { ...base, id: 'demo-3', title: 'סיור באתר', event_date: at(9), event_time: null, location: 'רחוב הרצל 12', people: [], description: 'להצטייד בנעליים סגורות.' },
  ]
  writeLocal(list)
  return list
}

export async function listEvents(): Promise<CalEvent[]> {
  if (!supabase) return readLocal()
  const { data, error } = await supabase.from('events').select(COLS).order('event_date').order('event_time', { nullsFirst: true })
  if (error) throw new Error(error.message)
  return (data as CalEvent[]).map(normalize)
}

export async function createEvent(d: EventDraft): Promise<CalEvent> {
  if (!d.event_date) throw new Error('חסר תאריך')
  if (!supabase) {
    const now = new Date().toISOString()
    const ev: CalEvent = { ...d, event_date: d.event_date, id: crypto.randomUUID(), user_id: null, reminder_sent: false, created_at: now, updated_at: now }
    writeLocal([...readLocal(), ev])
    return ev
  }
  const { data, error } = await supabase.from('events').insert({ ...d, event_time: d.event_time || null }).select(COLS).single()
  if (error) throw new Error(error.message)
  return normalize(data as CalEvent)
}

export async function updateEvent(id: string, patch: Partial<EventDraft>): Promise<CalEvent> {
  if (!supabase) {
    const list = readLocal()
    const i = list.findIndex((e) => e.id === id)
    if (i < 0) throw new Error('האירוע לא נמצא')
    const prev = list[i]
    // שינוי תאריך מאפס את התזכורת, כדי שתישלח שוב ליום החדש
    const dateChanged = patch.event_date && patch.event_date !== prev.event_date
    list[i] = { ...prev, ...patch, event_date: patch.event_date ?? prev.event_date, reminder_sent: dateChanged ? false : prev.reminder_sent, updated_at: new Date().toISOString() }
    writeLocal(list)
    return list[i]
  }
  const { data: prev } = await supabase.from('events').select('event_date').eq('id', id).single()
  const dateChanged = patch.event_date && prev && patch.event_date !== prev.event_date
  const { data, error } = await supabase
    .from('events')
    .update({ ...patch, event_time: patch.event_time || null, ...(dateChanged ? { reminder_sent: false } : {}), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLS)
    .single()
  if (error) throw new Error(error.message)
  return normalize(data as CalEvent)
}

export async function deleteEvent(id: string): Promise<void> {
  if (!supabase) {
    writeLocal(readLocal().filter((e) => e.id !== id))
    return
  }
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// העלאת המסמך המקורי ל-Storage: documents/{user_id}/{timestamp}_{filename}
export async function uploadSource(file: File): Promise<{ path: string; name: string } | null> {
  if (!supabase) return null
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return null
  // שם הקובץ במפתח בלועזית בלבד. השם המקורי נשמר בנפרד
  const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_')
  const path = `${u.user.id}/${Date.now()}_${safe}`
  const { error } = await supabase.storage.from('documents').upload(path, file)
  if (error) throw new Error(error.message)
  return { path, name: file.name }
}

export async function getSourceUrl(path: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

export async function getProfile(): Promise<Profile> {
  if (!supabase) {
    try { return { whatsapp_number: localStorage.getItem(LS_PROFILE) ?? '' } } catch { return { whatsapp_number: '' } }
  }
  const { data } = await supabase.from('profiles').select('whatsapp_number').maybeSingle()
  return { whatsapp_number: data?.whatsapp_number ?? '' }
}

export async function saveProfile(p: Profile): Promise<void> {
  if (!supabase) {
    try { localStorage.setItem(LS_PROFILE, p.whatsapp_number) } catch { /* אחסון חסום */ }
    return
  }
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('לא מחוברת')
  const { error } = await supabase.from('profiles').upsert({ user_id: u.user.id, whatsapp_number: p.whatsapp_number })
  if (error) throw new Error(error.message)
}

export { demoMode }
