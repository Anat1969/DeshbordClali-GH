import { useEffect, useMemo, useState } from 'react'
import Icon, { IconButton } from '../components/Icon'
import { useApp } from '../lib/ctx'
import { useProjects } from '../hooks/useProjects'
import { STATUS_LABEL, type Project, type ProjectStatus } from '../lib/projects'
import { daysUntil, todayIso } from '../lib/dateUtils'

type Filter = 'all' | 'live' | 'waiting' | 'done'
const FILTERS: [Filter, string][] = [['all', 'הכול'], ['live', 'פעילים'], ['waiting', 'ממתינים'], ['done', 'הושלמו']]
const STATUS_ORDER: ProjectStatus[] = ['planning', 'active', 'waiting', 'done']
const STATUS_INK: Record<ProjectStatus, string> = { planning: '#5B6270', active: '#1F7A44', waiting: '#B85F0B', done: '#2E2E2B' }

// כמה ימים עברו מאז עדכון אחרון
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))

// מצב המועד: באיחור, היום, בקרוב או רחוק
function dueInfo(p: Project): { text: string; tone: 'bad' | 'warn' | 'ok' } | null {
  if (!p.due_date || p.status === 'done') return null
  const d = daysUntil(p.due_date, todayIso())
  if (d < 0) return { text: `באיחור של ${-d} ימים`, tone: 'bad' }
  if (d === 0) return { text: 'המועד היום', tone: 'bad' }
  if (d <= 7) return { text: `בעוד ${d} ימים`, tone: 'warn' }
  return { text: `בעוד ${d} ימים`, tone: 'ok' }
}

// מעקב פרויקטים: סטטוס, התקדמות, מועד, הצעד הבא והערה. נשמר אוטומטית
export default function Projects() {
  const app = useApp()
  const { projects, loading, error, reload, add, patch, remove } = useProjects()
  const [name, setName] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const sorted = useMemo(() => {
    const list = projects.filter((p) => (filter === 'all' ? true : filter === 'live' ? p.status === 'active' || p.status === 'planning' : filter === 'waiting' ? p.status === 'waiting' : p.status === 'done'))
    // הכי דחוף למעלה: באיחור ואז לפי מועד. הושלמו בסוף
    const key = (p: Project) => (p.status === 'done' ? 9e6 : p.due_date ? daysUntil(p.due_date, todayIso()) : 1e6)
    return [...list].sort((a, b) => key(a) - key(b))
  }, [projects, filter])

  const late = projects.filter((p) => p.status !== 'done' && p.due_date && daysUntil(p.due_date, todayIso()) < 0).length
  const live = projects.filter((p) => p.status === 'active').length

  const submit = async () => {
    const v = name.trim()
    if (!v) return
    setName('')
    try {
      await add(v)
    } catch {
      setName(v)
      app.toast('ההוספה נכשלה')
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="flex items-center gap-3 text-3xl font-light"><Icon name="chart" size={28} />מעקב <b>פרויקטים</b></h1>
      <p className="mb-5 mt-1 text-mute">
        {loading ? '...' : <><span className="num">{live}</span> בביצוע{late > 0 && <>, <b className="text-bad"><span className="num">{late}</span> באיחור</b></>}. הכול נשמר אוטומטית.</>}
      </p>

      <div className="flex gap-2">
        <input className="field" value={name} placeholder="שם פרויקט חדש" aria-label="שם פרויקט חדש" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <IconButton name="plus" label="הוספת פרויקט" tone="primary" size={22} className="!h-11 !w-11" disabled={!name.trim()} onClick={submit} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="סינון פרויקטים">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`btn !min-h-9 text-sm ${filter === k ? 'btn-primary' : ''}`}>{label}</button>
        ))}
      </div>

      {error && <p className="mt-4 text-bad" role="alert">הטעינה נכשלה. <button type="button" className="underline underline-offset-4" onClick={reload}>ניסיון חוזר</button></p>}

      <ul className="m-0 mt-5 grid list-none items-start gap-4 p-0 lg:grid-cols-2">
        {loading && <li className="skeleton h-40 lg:col-span-2" />}
        {!loading && sorted.length === 0 && (
          <li className="rounded-lg bg-soft p-4 text-mute">{projects.length === 0 ? 'אין פרויקטים עדיין. הוסיפי את הראשון למעלה.' : 'אין פרויקטים בסינון הזה.'}</li>
        )}
        {sorted.map((p) => <ProjectCard key={p.id} p={p} onPatch={patch} onRemove={remove} />)}
      </ul>
    </div>
  )
}

function ProjectCard({ p, onPatch, onRemove }: { p: Project; onPatch: (id: string, x: Partial<Project>) => Promise<void>; onRemove: (id: string) => Promise<void> }) {
  const app = useApp()
  const [name, setName] = useState(p.name)
  const [next, setNext] = useState(p.next_step ?? '')
  const [note, setNote] = useState(p.note ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const due = dueInfo(p)
  const stale = p.status !== 'done' && daysSince(p.updated_at) >= 7

  useEffect(() => {
    if (!confirmDel) return
    const t = window.setTimeout(() => setConfirmDel(false), 3000)
    return () => window.clearTimeout(t)
  }, [confirmDel])

  const save = (x: Partial<Project>) => onPatch(p.id, x).catch(() => app.toast('השמירה נכשלה, השינוי בוטל'))
  const commitText = (field: 'name' | 'next_step' | 'note', value: string, cur: string | null) => {
    if (value.trim() !== (cur ?? '').trim()) save({ [field]: value.trim() || null } as Partial<Project>)
  }

  return (
    <li className="rounded-lg bg-white p-4 shadow-btn" style={{ borderTop: `4px solid ${STATUS_INK[p.status]}` }}>
      <div className="flex items-start gap-3">
        <input className="field !bg-transparent !px-0 text-xl font-semibold text-[#111111]" aria-label="שם הפרויקט" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() ? commitText('name', name, p.name) : setName(p.name)} />
        <IconButton name="x" label={confirmDel ? 'לחצי שוב למחיקה' : 'מחיקת הפרויקט'} tone="danger" size={18} className={`!h-9 !w-9 ${confirmDel ? '!bg-bad !text-white' : ''}`} onClick={() => (confirmDel ? onRemove(p.id).catch(() => app.toast('המחיקה נכשלה')) : setConfirmDel(true))} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div>
          <label className="label" htmlFor={`st-${p.id}`}>סטטוס</label>
          <select id={`st-${p.id}`} className="field" value={p.status} onChange={(e) => save({ status: e.target.value as ProjectStatus, ...(e.target.value === 'done' ? { progress: 100 } : {}) })}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`du-${p.id}`}>מועד יעד</label>
          <input id={`du-${p.id}`} type="date" className="field num" value={p.due_date ?? ''} onChange={(e) => save({ due_date: e.target.value || null })} />
          {due && <p className={`mt-1 text-sm font-semibold ${due.tone === 'bad' ? 'text-bad' : due.tone === 'warn' ? 'text-[#B85F0B]' : 'text-mute'}`}>{due.text}</p>}
        </div>
      </div>

      <div className="mt-3">
        <label className="label flex items-center justify-between" htmlFor={`pr-${p.id}`}>
          <span>התקדמות</span>
          <span className="num font-semibold text-[#111111]">{p.progress}%</span>
        </label>
        <input id={`pr-${p.id}`} type="range" min={0} max={100} step={5} value={p.progress} className="h-6 w-full cursor-pointer accent-[#1A2B4A]" onChange={(e) => save({ progress: Number(e.target.value) })} />
      </div>

      <div className="mt-3">
        <label className="label" htmlFor={`nx-${p.id}`}>הצעד הבא</label>
        <input id={`nx-${p.id}`} className="field" value={next} placeholder="מה הדבר הבא שצריך לקרות" onChange={(e) => setNext(e.target.value)} onBlur={() => commitText('next_step', next, p.next_step)} />
      </div>
      <div className="mt-3">
        <label className="label" htmlFor={`no-${p.id}`}>הערה</label>
        <textarea id={`no-${p.id}`} rows={2} className="field resize-y" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => commitText('note', note, p.note)} />
      </div>

      <p className={`mt-3 flex items-center gap-1.5 text-xs ${stale ? 'font-semibold text-[#B85F0B]' : 'text-mute'}`}>
        <Icon name="clock" size={12} />
        {stale ? `לא עודכן ${daysSince(p.updated_at)} ימים` : `עודכן ${daysSince(p.updated_at) === 0 ? 'היום' : `לפני ${daysSince(p.updated_at)} ימים`}`}
      </p>
    </li>
  )
}
