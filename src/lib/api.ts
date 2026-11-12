import { supabase } from './supabase'

// מפתח גישה אישי: נשמר בדפדפן, ונשלח לשרת בכל בקשה. השרת שומר רק את ה-hash שלו
const LS_KEY = 'yoman_key_v1'
const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function getKey(): string | null {
  try { return localStorage.getItem(LS_KEY) } catch { return null }
}
export function setKey(k: string) {
  try { localStorage.setItem(LS_KEY, k) } catch { /* אחסון חסום */ }
}
export function clearKey() {
  try { localStorage.removeItem(LS_KEY) } catch { /* אחסון חסום */ }
}

// קישור פרטי נראה כך: https://האתר/#k=המפתח. נקלט פעם אחת ומוסר מהכתובת
export function captureKeyFromUrl(): void {
  const m = window.location.hash.match(/[#&]k=([A-Za-z0-9_-]{20,})/)
  if (!m) return
  setKey(m[1])
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

export const privateLink = () => `${window.location.origin}/#k=${getKey() ?? ''}`

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code)
  }
}

// קריאה לשרת. 401 מוחק את המפתח ומחזיר למסך הכניסה
export async function api<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}, fn = 'yoman-api'): Promise<T> {
  if (!supabase || !URL_BASE) throw new ApiError(0, 'no_backend')
  const res = await fetch(`${URL_BASE}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-yoman-key': getKey() ?? '', apikey: ANON ?? '' },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    clearKey()
    window.dispatchEvent(new Event('yoman-auth-lost'))
  }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'error')
  return data as T
}
