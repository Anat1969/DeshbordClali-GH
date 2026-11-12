import { useEffect, useMemo, useState } from 'react'
import Icon, { IconButton } from '../components/Icon'
import { useApp } from '../lib/ctx'
import { STATUS_LABEL, type Milestone, type Project, type ProjectStatus } from '../lib/projects'
import { daysUntil, todayIso } from '../lib/dateUtils'
import { getContacts, gmailUrl, type Contact } from '../lib/work'

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
  const { projects, loading, error, reload, add, patch, remove } = app.projects
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
  // אבני דרך: שורות בעריכה נשמרות רק כשיש להן גם שם וגם תאריך
  const [ms, setMs] = useState<Milestone[]>(p.milestones)
  // איש קשר של הפרויקט ומייל ישיר מהכרטיס
  const [cName, setCName] = useState(p.contact_name ?? '')
  const [cMail, setCMail] = useState(p.contact_email ?? '')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [mailOpen, setMailOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const due = dueInfo(p)
  const stale = p.status !== 'done' && daysSince(p.updated_at) >= 7

  useEffect(() => {
    if (!confirmDel) return
    const t = window.setTimeout(() => setConfirmDel(false), 3000)
    return () => window.clearTimeout(t)
  }, [confirmDel])

  useEffect(() => { getContacts().then(setContacts).catch(() => { /* אין אנשי קשר */ }) }, [])
  const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cMail.trim())
  const pickContact = (v: string) => {
    setCName(v)
    const c = contacts.find((x) => x.name === v)
    if (c?.email) { setCMail(c.email); save({ contact_name: c.name, contact_email: c.email }) }
  }
  // טיוטה אוטומטית: סטטוס, הצעד הבא ואבני דרך קרובות
  const openMail = () => {
    const upcoming = ms.filter((m) => !m.done && m.date >= todayIso()).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 3)
    const lines = [`שלום ${cName.trim() || ''},`.replace(' ,', ','), '', `עדכון לגבי ${p.name}:`, `סטטוס: ${STATUS_LABEL[p.status]}, התקדמות ${p.progress}%.`]
    if (p.next_step) lines.push(`הצעד הבא: ${p.next_step}.`)
    if (p.due_date) lines.push(`מועד יעד: ${p.due_date.split('-').reverse().join('.')}.`)
    for (const m of upcoming) lines.push(`${m.name}: ${m.date.split('-').reverse().join('.')}`)
    lines.push('', 'ענת')
    setSubject(`עדכון: ${p.name}`)
    setBody(lines.join('\n'))
    setMailOpen(true)
  }
  const save = (x: Partial<Project>) => onPatch(p.id, x).catch(() => app.toast('השמירה נכשלה, השינוי בוטל'))
  const commitMs = (next: Milestone[]) => {
    setMs(next)
    save({ milestones: next.filter((m) => m.name.trim() && m.date) })
  }
  const editMs = (id: string, x: Partial<Milestone>) => setMs((l) => l.map((m) => (m.id === id ? { ...m, ...x } : m)))
  const commitText = (field: 'name' | 'next_step' | 'note' | 'contact_name' | 'contact_email', value: string, cur: string | null) => {
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

      {/* אבני דרך: תאריכים שמופיעים ביומן בסימן מיוחד, כדי לראות מסגרת ותוכנית עבודה */}
      <div className="mt-4 rounded-lg bg-soft/70 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><Icon name="diamond" size={14} />אבני דרך <span className="font-normal text-mute">(מופיעות ביומן)</span></p>
          <IconButton name="plus" label="הוספת אבן דרך" tone="primary" size={16} className="!h-8 !w-8" onClick={() => setMs((l) => [...l, { id: crypto.randomUUID(), name: '', date: p.due_date ?? todayIso(), done: false }])} />
        </div>
        {ms.length === 0 && <p className="text-sm text-mute">אין אבני דרך. הוסיפי תאריכים של שלבי העבודה.</p>}
        <ul className="m-0 grid list-none gap-2 p-0">
          {[...ms].sort((a, b) => (a.date < b.date ? -1 : 1)).map((m) => (
            <li key={m.id} className="grid grid-cols-[auto_9.5rem_1fr_auto] items-center gap-2">
              <input type="checkbox" className="h-5 w-5 cursor-pointer accent-[#1A2B4A]" aria-label={`בוצעה: ${m.name || 'אבן דרך'}`} checked={m.done} onChange={(e) => commitMs(ms.map((x) => (x.id === m.id ? { ...x, done: e.target.checked } : x)))} />
              <input type="date" className="field num !min-h-9 !py-1 text-sm" aria-label="תאריך אבן הדרך" value={m.date} onChange={(e) => editMs(m.id, { date: e.target.value })} onBlur={() => commitMs(ms)} />
              <input className={`field !min-h-9 !py-1 text-sm ${m.done ? 'text-mute line-through' : ''}`} placeholder="שם השלב" aria-label="שם אבן הדרך" value={m.name} onChange={(e) => editMs(m.id, { name: e.target.value })} onBlur={() => commitMs(ms)} />
              <IconButton name="x" label="הסרת אבן הדרך" tone="danger" size={14} className="!h-8 !w-8" onClick={() => commitMs(ms.filter((x) => x.id !== m.id))} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <label className="label" htmlFor={`nx-${p.id}`}>הצעד הבא</label>
        <input id={`nx-${p.id}`} className="field" value={next} placeholder="מה הדבר הבא שצריך לקרות" onChange={(e) => setNext(e.target.value)} onBlur={() => commitText('next_step', next, p.next_step)} />
      </div>
      <div className="mt-3 rounded-lg bg-soft/70 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Icon name="mail" size={14} />איש קשר בפרויקט</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="field !min-h-9 !py-1 text-sm" list={`ct-${p.id}`} placeholder="שם" aria-label="שם איש הקשר" value={cName} onChange={(e) => pickContact(e.target.value)} onBlur={() => commitText('contact_name', cName, p.contact_name)} />
          <datalist id={`ct-${p.id}`}>{contacts.map((c) => <option key={c.email || c.name} value={c.name} />)}</datalist>
          <input className="field num !min-h-9 !py-1 text-sm" dir="ltr" type="email" placeholder="מייל" aria-label="מייל איש הקשר" value={cMail} onChange={(e) => setCMail(e.target.value)} onBlur={() => mailOk || !cMail.trim() ? commitText('contact_email', cMail.trim(), p.contact_email) : app.toast('כתובת המייל לא תקינה')} />
        </div>
        <button type="button" className="btn mt-2 !min-h-9 gap-1.5 text-sm" disabled={!mailOk} onClick={() => (mailOpen ? setMailOpen(false) : openMail())}>
          <Icon name="send" size={14} />{mailOpen ? 'סגירת המייל' : 'שליחת מייל'}
        </button>
        {mailOpen && (
          <div className="mt-2 grid gap-2">
            <input className="field !min-h-9 !py-1 text-sm" aria-label="נושא" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className="field resize-y text-sm" rows={7} aria-label="גוף המייל" value={body} onChange={(e) => setBody(e.target.value)} />
            <a className="btn btn-primary !min-h-9 gap-1.5 text-sm" href={gmailUrl(cMail.trim(), subject, body)} target="_blank" rel="noreferrer"><Icon name="mail" size={14} />פתיחה ב-Gmail לשליחה</a>
          </div>
        )}
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
