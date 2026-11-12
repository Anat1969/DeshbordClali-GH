import { useCallback, useEffect, useState } from 'react'
import type { Task } from '../types'
import * as store from '../lib/tasks'

// משימות עם עדכון מיידי במסך וחזרה לאחור אם השרת נכשל
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTasks(await store.listTasks())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (text: string) => {
    const t = await store.createTask(text)
    setTasks((l) => [t, ...l])
  }

  const patch = async (id: string, p: Partial<Pick<Task, 'text' | 'note' | 'done'>>) => {
    const prev = tasks
    setTasks((l) => l.map((t) => (t.id === id ? { ...t, ...p, done_at: p.done === undefined ? t.done_at : p.done ? new Date().toISOString() : null } : t)))
    try {
      const t = await store.updateTask(id, p)
      setTasks((l) => l.map((x) => (x.id === id ? t : x)))
    } catch (e) {
      setTasks(prev)
      throw e
    }
  }

  // מסמכים: התוצאה מהשרת מחליפה את המשימה במסך
  const replace = (t: Task) => setTasks((l) => l.map((x) => (x.id === t.id ? { ...t, docs: t.docs ?? [] } : x)))
  const addLink = async (id: string, name: string, url: string) => replace(await store.addTaskLink(id, name, url))
  const addFile = async (id: string, file: File) => replace(await store.uploadTaskFile(id, file))
  const removeDoc = async (id: string, docId: string) => replace(await store.removeTaskDoc(id, docId))

  const remove = async (id: string) => {
    const prev = tasks
    setTasks((l) => l.filter((t) => t.id !== id))
    try {
      await store.deleteTask(id)
    } catch (e) {
      setTasks(prev)
      throw e
    }
  }

  return { tasks, loading, error, reload: load, add, patch, remove, addLink, addFile, removeDoc }
}
