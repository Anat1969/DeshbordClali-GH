// קטגוריות: שבעה צבעי קשת. ארבעה מוגדרים כברירת מחדל, ושלושה פנויים לשמות של ענת
export const SLOTS = [
  { key: 'red', label: 'אדום', color: '#D93B3B', fg: '#FFFFFF' },
  { key: 'orange', label: 'כתום', color: '#F08A24', fg: '#2E2E2B' },
  { key: 'yellow', label: 'צהוב', color: '#F2C514', fg: '#2E2E2B' },
  { key: 'green', label: 'ירוק', color: '#2E9E5B', fg: '#FFFFFF' },
  { key: 'blue', label: 'כחול', color: '#2B6CD9', fg: '#FFFFFF' },
  { key: 'indigo', label: 'אינדיגו', color: '#4B3FA8', fg: '#FFFFFF' },
  { key: 'violet', label: 'סגול', color: '#8E44C8', fg: '#FFFFFF' },
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
