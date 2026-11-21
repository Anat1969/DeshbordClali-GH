import { useSyncExternalStore } from 'react'

// חלופות תצוגה של דף הבית. "רגיל" הוא ברירת המחדל, והבחירה נשמרת בדפדפן הזה
export type HomeView = 'classic' | 'magazine' | 'desk' | 'timeline'
export const VIEWS: { key: HomeView; name: string; text: string }[] = [
  { key: 'classic', name: 'רגיל', text: 'תדרוך הבוקר כמו שהוא: צורת היום, מה דורש אותך, משימות והשראה.' },
  { key: 'magazine', name: 'מגזין בוקר', text: 'כפולת עמודים: כותרת גדולה ליום, ציור היום על כל הרוחב, ושלושה טורים לקריאה.' },
  { key: 'desk', name: 'שולחן עבודה', text: 'מסך אחד בלי מעברים: משימות, היומן במרכז, והשיחה עם הבוט לצידו.' },
  { key: 'timeline', name: 'ציר זמן', text: 'קו אחד מהיום קדימה: אירועים, אבני דרך ומועדי פרויקטים, עם הימים הפנויים ביניהם.' },
]

const LS = 'yoman_home_view_v1'
const subs = new Set<() => void>()
const read = (): HomeView => {
  try {
    const v = localStorage.getItem(LS)
    return VIEWS.some((x) => x.key === v) ? (v as HomeView) : 'classic'
  } catch { return 'classic' }
}
let cur = read()
export function setHomeView(v: HomeView) {
  cur = v
  try { localStorage.setItem(LS, v) } catch { /* אחסון חסום */ }
  subs.forEach((f) => f())
}
export const useHomeView = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => cur)
