import { useMemo, useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useSpeech } from '../hooks/useSpeech'
import { useApp } from '../lib/ctx'
import type { Task } from '../types'

type Filter = 'all' | 'open' | 'done'
const FILTERS: [Filter, string][] = [['all', 'הכול'], ['open', 'פתוחות'], ['done', 'בוצעו']]

// רשימת משימות בצד: הקלדה או הקלטה, קו חוצה על משימה שבוצעה, והערה לכל משימה
export default function TaskList() {
  const app = useApp()
  const { tasks, loading, error, reload, add, patch, remove } = useTasks()
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
    <section aria-label="רשימת משימות" className="flex min-h-0 flex-col rounded-lg bg-soft/60 p-3.5">
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
        <button type="button" className="btn btn-primary shrink-0" disabled={!text.trim()} onClick={submit}>הוספה</button>
      </div>
      {speech.supported && (
        <button type="button" className="mt-2 self-start text-sm text-navy underline underline-offset-4" onClick={speech.toggle}>
          {speech.listening ? 'עצירת הקלטה' : 'הקלטה ותמלול של משימה'}
        </button>
      )}

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

      <ul className="m-0 mt-3 flex max-h-[420px] min-h-0 list-none flex-col gap-2 overflow-auto p-0">
        {loading && <li className="skeleton h-12" />}
        {!loading && shown.length === 0 && (
          <li className="rounded-lg bg-white p-3 text-sm text-mute">
            {tasks.length === 0 ? 'אין משימות. הקלידי או הקליטי את המשימה הראשונה.' : filter === 'open' ? 'אין משימות פתוחות.' : 'אין משימות שבוצעו.'}
          </li>
        )}
        {shown.map((t) => (
          <TaskRow key={t.id} task={t} onPatch={patch} onRemove={remove} />
        ))}
      </ul>
    </section>
  )
}

function TaskRow({ task, onPatch, onRemove }: { task: Task; onPatch: (id: string, p: Partial<Pick<Task, 'text' | 'note' | 'done'>>) => Promise<void>; onRemove: (id: string) => Promise<void> }) {
  const app = useApp()
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(task.note ?? '')
  const [saved, setSaved] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const speech = useSpeech((t) => setNote((v) => (v + ' ' + t).trim()))

  const run = (fn: () => Promise<void>) => fn().catch(() => app.toast('הפעולה נכשלה, השינוי בוטל'))

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
        <span className={`min-w-0 flex-1 break-words ${task.done ? 'text-mute line-through decoration-2' : ''}`}>{task.text}</span>
      </div>

      {task.note && !noteOpen && <p className="ms-8 mt-1 whitespace-pre-wrap break-words text-sm text-mute">{task.note}</p>}

      {noteOpen && (
        <div className="ms-8 mt-2">
          <textarea className="field resize-none" rows={3} value={note} aria-label="הערה למשימה" placeholder="הערה" onChange={(e) => setNote(e.target.value)} onBlur={saveNote} />
          <div className="mt-1 flex items-center gap-3 text-sm">
            {speech.supported && (
              <button type="button" className="text-navy underline underline-offset-4" onClick={speech.toggle}>
                {speech.listening ? 'עצירת הקלטה' : 'הקלטה ותמלול'}
              </button>
            )}
            {saved && <span className="text-good">נשמר</span>}
          </div>
        </div>
      )}

      <div className="ms-8 mt-2 flex gap-4 text-sm">
        <button type="button" className="text-navy underline underline-offset-4" onClick={() => (noteOpen ? saveNote().then(() => setNoteOpen(false)) : setNoteOpen(true))}>
          {noteOpen ? 'סגירת הערה' : task.note ? 'עריכת הערה' : 'הוספת הערה'}
        </button>
        {confirmDel ? (
          <button type="button" className="font-semibold text-bad underline underline-offset-4" onClick={() => run(() => onRemove(task.id))}>בטוחה? מחיקה</button>
        ) : (
          <button type="button" className="text-bad underline underline-offset-4" onClick={() => setConfirmDel(true)}>מחיקה</button>
        )}
      </div>
    </li>
  )
}
