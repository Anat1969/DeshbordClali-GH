import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_NAMES, type CatNames, type SlotKey } from '../lib/categories'
import { getCategories, saveCategories } from '../lib/store'

// שמות הקטגוריות, עם שמירה אוטומטית כמה רגעים אחרי ההקלדה
export type CatSave = 'idle' | 'saving' | 'saved' | 'error'

export function useCategories(enabled: boolean) {
  const [names, setNames] = useState<CatNames>(DEFAULT_NAMES)
  const [save, setSave] = useState<CatSave>('idle')
  const timer = useRef<number>(0)
  const latest = useRef(names)

  useEffect(() => {
    if (!enabled) return
    getCategories().then((n) => {
      latest.current = n
      setNames(n)
    }).catch(() => { /* נשארים עם ברירות המחדל */ })
  }, [enabled])

  const rename = useCallback((k: SlotKey, v: string) => {
    const next = { ...latest.current, [k]: v.slice(0, 24) }
    latest.current = next
    setNames(next)
    setSave('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      try {
        await saveCategories(latest.current)
        setSave('saved')
      } catch {
        setSave('error')
      }
    }, 600)
  }, [])

  return { names, rename, save }
}
