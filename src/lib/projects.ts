import { supabase } from './supabase'
import { api } from './api'

// מעקב פרויקטים: בשרת כשמחובר, ואחרת localStorage (מצב הדגמה)
export type ProjectStatus = 'planning' | 'active' | 'waiting' | 'done'
export interface Project {
  id: string
  name: string
  status: ProjectStatus
  progress: number
  next_step: string | null
  due_date: string | null
  note: string | null
  created_at: string
  updated_at: string
}
export type ProjectPatch = Partial<Pick<Project, 'name' | 'status' | 'progress' | 'next_step' | 'due_date' | 'note'>>

export const STATUS_LABEL: Record<ProjectStatus, string> = { planning: 'תכנון', active: 'בביצוע', waiting: 'ממתין', done: 'הושלם' }

const LS = 'sc_projects_v1'
const F = 'yoman-projects'
const read = (): Project[] => { try { return JSON.parse(localStorage.getItem(LS) ?? '[]') as Project[] } catch { return [] } }
const write = (l: Project[]) => { try { localStorage.setItem(LS, JSON.stringify(l)) } catch { /* אחסון חסום */ } }

export async function listProjects(): Promise<Project[]> {
  return supabase ? (await api<{ projects: Project[] }>('list', {}, F)).projects : read()
}

export async function createProject(name: string): Promise<Project> {
  if (!supabase) {
    const now = new Date().toISOString()
    const p: Project = { id: crypto.randomUUID(), name, status: 'active', progress: 0, next_step: null, due_date: null, note: null, created_at: now, updated_at: now }
    write([p, ...read()])
    return p
  }
  return (await api<{ project: Project }>('create', { draft: { name } }, F)).project
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<Project> {
  if (!supabase) {
    const l = read()
    const i = l.findIndex((p) => p.id === id)
    if (i < 0) throw new Error('הפרויקט לא נמצא')
    l[i] = { ...l[i], ...patch, updated_at: new Date().toISOString() }
    write(l)
    return l[i]
  }
  return (await api<{ project: Project }>('update', { id, patch }, F)).project
}

export async function deleteProject(id: string): Promise<void> {
  if (!supabase) return write(read().filter((p) => p.id !== id))
  await api('delete', { id }, F)
}
