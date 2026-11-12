import { useCallback, useEffect, useState } from 'react'
import type { CalEvent, EventDraft } from '../types'
import * as store from '../lib/store'

// אירועים עם עדכון מיידי במסך וחזרה לאחור אם השרת נכשל
export function useEvents(enabled: boolean) {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setEvents(await store.listEvents())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'טעינת האירועים נכשלה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) load()
  }, [enabled, load])

  const sorted = (l: CalEvent[]) => [...l].sort((a, b) => (a.event_date + (a.event_time ?? '')).localeCompare(b.event_date + (b.event_time ?? '')))

  const add = async (d: EventDraft) => {
    const ev = await store.createEvent(d)
    setEvents((l) => sorted([...l, ev]))
    setFlashId(ev.id)
    return ev
  }

  const update = async (id: string, patch: Partial<EventDraft>) => {
    const prev = events
    setEvents((l) => sorted(l.map((e) => (e.id === id ? { ...e, ...patch, event_date: patch.event_date ?? e.event_date } : e))))
    try {
      const ev = await store.updateEvent(id, patch)
      setEvents((l) => sorted(l.map((e) => (e.id === id ? ev : e))))
      setFlashId(id)
    } catch (err) {
      setEvents(prev)
      throw err
    }
  }

  const remove = async (id: string) => {
    const prev = events
    setEvents((l) => l.filter((e) => e.id !== id))
    try {
      await store.deleteEvent(id)
    } catch (err) {
      setEvents(prev)
      throw err
    }
  }

  return { events, loading, error, flashId, reload: load, add, update, remove }
}
