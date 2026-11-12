// קטגוריות: שבעה צבעי קשת. ארבעה מוגדרים כברירת מחדל, ושלושה פנויים לשמות של ענת
// icon: אייקון לכל צבע (עבודה תיק, בילוי כוס, רפואה צלב, לימודים ספר). ink: גוון כהה לאייקון על רקע בהיר
export const SLOTS = [
  { key: 'red', label: 'אדום', color: '#D93B3B', ink: '#B92B2B', fg: '#FFFFFF', icon: 'briefcase' },
  { key: 'orange', label: 'כתום', color: '#F08A24', ink: '#B85F0B', fg: '#2E2E2B', icon: 'home' },
  { key: 'yellow', label: 'צהוב', color: '#F2C514', ink: '#8A6D00', fg: '#2E2E2B', icon: 'star' },
  { key: 'green', label: 'ירוק', color: '#2E9E5B', ink: '#1F7A44', fg: '#FFFFFF', icon: 'glass' },
  { key: 'blue', label: 'כחול', color: '#2B6CD9', ink: '#1E52AE', fg: '#FFFFFF', icon: 'cross' },
  { key: 'indigo', label: 'אינדיגו', color: '#4B3FA8', ink: '#3B3188', fg: '#FFFFFF', icon: 'flag' },
  { key: 'violet', label: 'סגול', color: '#8E44C8', ink: '#6F2FA3', fg: '#FFFFFF', icon: 'book' },
] as const

export type SlotKey = (typeof SLOTS)[number]['key']
export type CatNames = Record<SlotKey, string>

export const DEFAULT_NAMES: CatNames = { red: 'עבודה', orange: '', yellow: '', green: 'בילוי', blue: 'רפואה', indigo: '', violet: 'לימודים' }

export const slotOf = (k: string | null | undefined) => SLOTS.find((s) => s.key === k) ?? null

// צבע בהיר לרקע של יום: אותו צבע בשקיפות של כ-35 אחוז
export const tint = (hex: string) => `${hex}59`

// משלים שמות חסרים מברירות המחדל. שם ריק שנשמר במפורש נשאר ריק
export function mergeNames(saved: Partial<Record<string, string>> | null | undefined): CatNames {
  const out = { ...DEFAULT_NAMES }
  for (const s of SLOTS) if (saved && typeof saved[s.key] === 'string') out[s.key] = saved[s.key] as string
  return out
}
