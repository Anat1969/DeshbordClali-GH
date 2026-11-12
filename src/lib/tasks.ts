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
  return (await api<{ tasks: Task[] }>('list', {}, T)).tasks.map((t) => ({ ...t, docs: t.docs ?? [] }))
}

export async function createTask(text: string): Promise<Task> {
  if (!supabase) {
    const t: Task = { id: crypto.randomUUID(), text, note: null, done: false, done_at: null, created_at: new Date().toISOString(), docs: [] }
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

// ---- מסמכים למשימה: קבצים וקישורים, כדי שיהיה חומר לבצע אותה ----
export const MAX_DOC_BYTES = 10 * 1024 * 1024

export async function addTaskLink(id: string, name: string, url: string): Promise<Task> {
  const u = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
  if (!supabase) {
    const l = readLocal()
    const i = l.findIndex((t) => t.id === id)
    if (i < 0) throw new Error('המשימה לא נמצאה')
    l[i] = { ...l[i], docs: [...(l[i].docs ?? []), { id: crypto.randomUUID(), kind: 'link', name: name.trim() || new URL(u).hostname, url: u }] }
    writeLocal(l)
    return l[i]
  }
  return (await api<{ task: Task }>('doc_add', { id, doc: { kind: 'link', name, url: u } }, T)).task
}

export async function uploadTaskFile(id: string, file: File): Promise<Task> {
  if (!supabase) throw new Error('העלאת קבצים זמינה אחרי חיבור לשרת.')
  if (file.size > MAX_DOC_BYTES) throw new Error('הקובץ גדול מ-10MB.')
  const { path, token } = await api<{ path: string; token: string }>('upload_url', { name: file.name }, T)
  const { error } = await supabase.storage.from('yoman-documents').uploadToSignedUrl(path, token, file)
  if (error) throw new Error(error.message)
  return (await api<{ task: Task }>('doc_add', { id, doc: { kind: 'file', name: file.name, path, size: file.size } }, T)).task
}

export async function removeTaskDoc(id: string, docId: string): Promise<Task> {
  if (!supabase) {
    const l = readLocal()
    const i = l.findIndex((t) => t.id === id)
    if (i < 0) throw new Error('המשימה לא נמצאה')
    l[i] = { ...l[i], docs: (l[i].docs ?? []).filter((d) => d.id !== docId) }
    writeLocal(l)
    return l[i]
  }
  return (await api<{ task: Task }>('doc_remove', { id, doc_id: docId }, T)).task
}

export async function taskDocUrl(id: string, docId: string): Promise<string | null> {
  if (!supabase) return null
  return (await api<{ url: string | null }>('doc_url', { id, doc_id: docId }, T)).url
}
