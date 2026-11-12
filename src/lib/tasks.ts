import { supabase } from './supabase'
import { api } from './api'
import type { Task } from '../types'

// משימות: בשרת כשמחובר, ואחרת localStorage (מצב הדגמה)
const LS = 'sc_tasks_v1'

function readLocal(): Task[] {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) return JSON.parse(raw) as Task[]
  } catch { /* אחסון חסום */ }
  return []
}
function writeLocal(l: Task[]) {
  try { localStorage.setItem(LS, JSON.stringify(l)) } catch { /* אחסון חסום */ }
}

const T = 'yoman-tasks'

export async function listTasks(): Promise<Task[]> {
  if (!supabase) return readLocal()
  return (await api<{ tasks: Task[] }>('list', {}, T)).tasks
}

export async function createTask(text: string): Promise<Task> {
  if (!supabase) {
    const t: Task = { id: crypto.randomUUID(), text, note: null, done: false, done_at: null, created_at: new Date().toISOString() }
    writeLocal([t, ...readLocal()])
    return t
  }
  return (await api<{ task: Task }>('create', { text }, T)).task
}

export async function updateTask(id: string, patch: Partial<Pick<Task, 'text' | 'note' | 'done'>>): Promise<Task> {
  if (!supabase) {
    const l = readLocal()
    const i = l.findIndex((t) => t.id === id)
    if (i < 0) throw new Error('המשימה לא נמצאה')
    l[i] = { ...l[i], ...patch, done_at: patch.done === undefined ? l[i].done_at : patch.done ? new Date().toISOString() : null }
    writeLocal(l)
    return l[i]
  }
  return (await api<{ task: Task }>('update', { id, patch }, T)).task
}

export async function deleteTask(id: string): Promise<void> {
  if (!supabase) {
    writeLocal(readLocal().filter((t) => t.id !== id))
    return
  }
  await api('delete', { id }, T)
}
