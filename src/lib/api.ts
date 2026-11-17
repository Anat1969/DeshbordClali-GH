import { supabase } from './supabase'

// בלי התחברות: האפליקציה פותחת ישר את היומן. המפתח כאן קבוע, והשרת משתמש בו רק כדי לדעת מאיזה יומן לקרוא.
// שימי לב: מי שמכיר את כתובת האתר רואה את היומן. כדי להחזיר הגנה, מחליפים את המפתח בטבלת yoman_keys ומחזירים את מסך הכניסה.
const OPEN_KEY = 'a6742af980f01eac191312e956c95e982711d16a0b3f3542'
const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const getKey = (): string => OPEN_KEY

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
    headers: { 'Content-Type': 'application/json', 'x-yoman-key': getKey(), apikey: ANON ?? '' },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'error')
  return data as T
}
