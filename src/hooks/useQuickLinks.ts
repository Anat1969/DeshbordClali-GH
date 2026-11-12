import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_LINKS, getLinks, saveLinks, type QLink } from '../lib/work'

// קישורים חשובים: נטענים פעם אחת, ונשמרים בשרת בכל שינוי
export function useQuickLinks(enabled: boolean) {
  const [items, setItems] = useState<QLink[]>(DEFAULT_LINKS)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (enabled) getLinks().then(setItems).catch(() => { /* נשארים עם ברירת המחדל */ })
  }, [enabled])

  const commit = useCallback(async (next: QLink[]) => {
    const prev = items
    setItems(next)
    try {
      await saveLinks(next)
      setError(false)
    } catch {
      setItems(prev)
      setError(true)
    }
  }, [items])

  const add = (name: string, url: string) => commit([...items, { name: name.trim(), url: /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}` }])
  const remove = (i: number) => commit(items.filter((_, x) => x !== i))
  return { items, add, remove, error }
}
