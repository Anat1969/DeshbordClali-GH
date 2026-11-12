import { useEffect, useMemo, useRef, useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useSpeech } from '../hooks/useSpeech'
import { useApp } from '../lib/ctx'
import Icon, { IconButton } from './Icon'
import { formatCreated } from '../lib/dateUtils'
import DocLink from './DocLink'
import { MAX_DOC_BYTES } from '../lib/tasks'
import VoiceButton from './VoiceButton'
import type { Task } from '../types'

type Filter = 'all' | 'open' | 'done'
const FILTERS: [Filter, string][] = [['all', 'הכול'], ['open', 'פתוחות'], ['done', 'בוצעו']]

// רשימת משימות בצד: הקלדה או הקלטה, קו חוצה על משימה שבוצעה, והערה לכל משימה
export default function TaskList() {
  const app = useApp()
  const { tasks, loading, error, reload, add, patch, remove, addLink, addFile, removeDoc } = useTasks()
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const speech = useSpeech((t) => setText((v) => (v + ' ' + t).trim()))

  const open = tasks.filter((t) => !t.done).length
  const shown = useMemo(() => {
    const l = tasks.filter((t) => (filter === 'all' ? true : filter === 'open' ? !t.done : t.done))
    // פתוחות למעלה, בוצעו למטה
    return [...l].sort((a, b) => Number(a.done) - Number(b.done))
  }, [tasks, filter])

  const submit = async () => {
    const v = text.trim()
    if (!v) return
    setText('')
    try {
      await add(v)
    } catch {
      setText(v)
      app.toast('ההוספה נכשלה, נסי שוב')
    }
  }

  return (
    <section aria-label="רשימת משימות" className="flex min-h-0 flex-col rounded-lg bg-soft/60 p-3.5 lg:flex-1">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-light">משימות</h2>
        <span className="text-sm text-mute">
          <span className="num">{open}</span> פתוחות מתוך <span className="num">{tasks.length}</span>
        </span>
      </div>

      <div className="flex gap-2">
        <input
          className="field"
          value={text}
          placeholder="משימה חדשה"
          aria-label="משימה חדשה"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <IconButton name="plus" label="הוספת משימה" tone="primary" size={22} className="!h-11 !w-11" disabled={!text.trim()} onClick={submit} />
      </div>
      <VoiceButton speech={speech} label="הקלטת משימה" className="mt-2" />

      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="סינון משימות">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`btn !min-h-9 text-sm ${filter === k ? 'btn-primary' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-bad" role="alert">
          טעינת המשימות נכשלה. <button type="button" className="underline underline-offset-4" onClick={reload}>ניסיון חוזר</button>
        </p>
      )}

      <ul className="m-0 mt-3 flex max-h-[420px] min-h-0 list-none flex-col gap-2 overflow-auto p-0 lg:max-h-none lg:flex-1">
        {loading && <li className="skeleton h-12" />}
        {!loading && shown.length === 0 && (
          <li className="rounded-lg bg-white p-3 text-sm text-mute">
            {tasks.length === 0 ? 'אין משימות. הקלידי או הקליטי את המשימה הראשונה.' : filter === 'open' ? 'אין משימות פתוחות.' : 'אין משימות שבוצעו.'}
          </li>
        )}
        {shown.map((t) => (
          <TaskRow key={t.id} task={t} onPatch={patch} onRemove={remove} docs={{ addLink, addFile, removeDoc }} />
        ))}
      </ul>
    </section>
  )
}

interface DocApi {
  addLink: (id: string, name: string, url: string) => Promise<void>
  addFile: (id: string, file: File) => Promise<void>
  removeDoc: (id: string, docId: string) => Promise<void>
}

function TaskRow({ task, onPatch, onRemove, docs }: { task: Task; onPatch: (id: string, p: Partial<Pick<Task, 'text' | 'note' | 'done'>>) => Promise<void>; onRemove: (id: string) => Promise<void>; docs: DocApi }) {
  const app = useApp()
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(task.note ?? '')
  const [saved, setSaved] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [busyDoc, setBusyDoc] = useState(false)
  const [lname, setLname] = useState('')
  const [lurl, setLurl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const speech = useSpeech((t) => setNote((v) => (v + ' ' + t).trim()))

  // לחיצה ראשונה על X מסמנת למחיקה, ואם לא לוחצים שוב תוך 3 שניות היא מתבטלת
  useEffect(() => {
    if (!confirmDel) return
    const t = window.setTimeout(() => setConfirmDel(false), 3000)
    return () => window.clearTimeout(t)
  }, [confirmDel])

  const run = (fn: () => Promise<void>) => fn().catch(() => app.toast('הפעולה נכשלה, השינוי בוטל'))

  const guard = async (fn: () => Promise<void>) => {
    setBusyDoc(true)
    try { await fn() } catch (e) { app.toast(e instanceof Error && !/^[a-z_]+$/.test(e.message) ? e.message : 'הפעולה נכשלה') } finally { setBusyDoc(false) }
  }
  const pickFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_DOC_BYTES) return app.toast('הקובץ גדול מ-10MB.')
    guard(() => docs.addFile(task.id, f))
  }
  const submitLink = () => {
    if (!lurl.trim()) return
    guard(async () => {
      await docs.addLink(task.id, lname, lurl)
      setLname('')
      setLurl('')
    })
  }

  const saveNote = async () => {
    if (note.trim() === (task.note ?? '').trim()) return
    await run(() => onPatch(task.id, { note: note.trim() || null }))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <li className="rounded-lg bg-white p-2.5">
      <div className="flex items-start gap-3">
        {/* סימון: תיבה רגילה. משימה שבוצעה מקבלת קו חוצה */}
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#1A2B4A]"
          checked={task.done}
          aria-label={`סימון כבוצע: ${task.text}`}
          onChange={(e) => run(() => onPatch(task.id, { done: e.target.checked }))}
        />
        <div className="min-w-0 flex-1">
          {/* משימה פתוחה: שחור ובולט. משימה שבוצעה: קו חוצה ואפור */}
          <span className={`block break-words ${task.done ? 'text-mute line-through decoration-2' : 'font-semibold text-[#111111]'}`}>{task.text}</span>
          {formatCreated(task.created_at) && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-mute">
              <Icon name="clock" size={12} />
              {formatCreated(task.created_at)}
            </p>
          )}
        </div>
        {/* הערה ומחיקה: אייקונים בצד שמאל של השורה, כדי לפנות מקום לטקסט */}
        <div className="flex shrink-0 items-center">
          <IconButton
            name="note"
            label={noteOpen ? 'סגירת הערה' : task.note ? 'עריכת הערה' : 'הוספת הערה'}
            size={16}
            className={`!h-8 !w-8 ${noteOpen || task.note ? '!bg-[#E8ECF4] !text-navy' : ''}`}
            onClick={() => (noteOpen ? saveNote().then(() => setNoteOpen(false)) : setNoteOpen(true))}
          />
          {/* חומר לביצוע: מסמכים וקישורים של המשימה */}
          <span className="relative inline-flex">
            <IconButton
              name="paperclip"
              label={docsOpen ? 'סגירת מסמכים' : task.docs.length ? `מסמכים (${task.docs.length})` : 'הוספת מסמכים'}
              size={16}
              className={`!h-8 !w-8 ${docsOpen || task.docs.length ? '!bg-[#E8ECF4] !text-navy' : ''}`}
              onClick={() => setDocsOpen((o) => !o)}
            />
            {task.docs.length > 0 && <span className="num pointer-events-none absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] text-white">{task.docs.length}</span>}
          </span>
          <IconButton
            name="x"
            label={confirmDel ? 'לחצי שוב למחיקה' : 'מחיקת המשימה'}
            tone="danger"
            size={16}
            className={`!h-8 !w-8 ${confirmDel ? '!bg-bad !text-white' : ''}`}
            onClick={() => (confirmDel ? run(() => onRemove(task.id)) : setConfirmDel(true))}
          />
        </div>
      </div>

      {docsOpen && (
        <div className="ms-8 mt-2 rounded-lg bg-soft/70 p-2.5">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Icon name="paperclip" size={14} />חומר לביצוע המשימה</p>
          {task.docs.length === 0 ? (
            <p className="text-sm text-mute">אין מסמכים. הוסיפי קובץ או קישור עם החומר שצריך כדי לבצע.</p>
          ) : (
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {task.docs.map((d) => (
                <li key={d.id} className="flex items-center gap-1">
                  <span className="min-w-0 flex-1"><DocLink taskId={task.id} doc={d} /></span>
                  <IconButton name="x" label={`הסרת ${d.name}`} tone="danger" size={14} className="!h-7 !w-7" disabled={busyDoc} onClick={() => guard(() => docs.removeDoc(task.id, d.id))} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button type="button" className="btn !min-h-9 text-sm" disabled={busyDoc} onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} />
              {busyDoc ? 'מעלה...' : 'הוספת קובץ'}
            </button>
            <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,image/*" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <div className="mt-2 grid grid-cols-[1fr_1.4fr_auto] items-center gap-2">
            <input className="field !min-h-9 !py-1 text-sm" placeholder="שם (לא חובה)" aria-label="שם הקישור" value={lname} onChange={(e) => setLname(e.target.value)} />
            <input className="field num !min-h-9 !py-1 text-sm" dir="ltr" placeholder="https://..." aria-label="כתובת הקישור" value={lurl} onChange={(e) => setLurl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitLink()} />
            <IconButton name="plus" label="הוספת קישור" tone="primary" size={16} className="!h-9 !w-9" disabled={busyDoc || !lurl.trim()} onClick={submitLink} />
          </div>
        </div>
      )}

      {task.note && !noteOpen && <p className="ms-8 mt-1 whitespace-pre-wrap break-words text-sm text-mute">{task.note}</p>}

      {noteOpen && (
        <div className="ms-8 mt-2">
          <textarea className="field resize-none" rows={3} value={note} aria-label="הערה למשימה" placeholder="הערה" onChange={(e) => setNote(e.target.value)} onBlur={saveNote} />
          <VoiceButton speech={speech} className="mt-2" />
          {saved && <p className="mt-1 text-sm text-good">נשמר</p>}
        </div>
      )}
    </li>
  )
}
