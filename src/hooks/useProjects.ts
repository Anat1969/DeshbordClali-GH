import { useCallback, useEffect, useState } from 'react'
import * as store from '../lib/projects'
import type { Project, ProjectPatch } from '../lib/projects'

// פרויקטים עם עדכון מיידי במסך וחזרה לאחור אם השרת נכשל
export function useProjects(enabled = true) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setProjects(await store.listProjects())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { if (enabled) load() }, [enabled, load])

  const add = async (name: string) => {
    const p = await store.createProject(name)
    setProjects((l) => [p, ...l])
  }
  const patch = async (id: string, p: ProjectPatch) => {
    const prev = projects
    setProjects((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)))
    try {
      const saved = await store.updateProject(id, p)
      setProjects((l) => l.map((x) => (x.id === id ? saved : x)))
    } catch (e) {
      setProjects(prev)
      throw e
    }
  }
  const remove = async (id: string) => {
    const prev = projects
    setProjects((l) => l.filter((x) => x.id !== id))
    try {
      await store.deleteProject(id)
    } catch (e) {
      setProjects(prev)
      throw e
    }
  }
  return { projects, loading, error, reload: load, add, patch, remove }
}
