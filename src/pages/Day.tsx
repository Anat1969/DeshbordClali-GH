import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EventCard from '../components/EventCard'
import EventModal from '../components/EventModal'
import UploadZone from '../components/UploadZone'
import TaskList from '../components/TaskList'
import Icon, { IconButton } from '../components/Icon'
import { useApp } from '../lib/ctx'
import { addDays, formatLong, todayIso } from '../lib/dateUtils'
import { milestoneMap } from '../lib/projects'
import type { CalEvent } from '../types'

// דף היום: אירועי היום שנבחר, העלאת מסמך ומשימות. הלוח עצמו בדף הבית
export default function Day({ uploading, step }: { uploading: boolean; step: string }) {
  const app = useApp()
  const { events, loading, flashId } = app.ev
  const [params, setParams] = useSearchParams()
  const selected = params.get('d') || todayIso()
  const [open, setOpen] = useState<CalEvent | null>(null)

  const milestones = useMemo(() => milestoneMap(app.projects.projects), [app.projects.projects])
  const dayMarks = milestones.get(selected) ?? []
  const day = events.filter((e) => e.event_date === selected)
  const openLive = open ? events.find((e) => e.id === open.id) ?? null : null
  const go = (n: number) => setParams({ d: addDays(selected, n) })

  return (
    <div className="mx-auto grid w-full flex-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:items-start">
      <section aria-label="אירועי היום שנבחר" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <IconButton name="chevronR" label="היום הקודם" onClick={() => go(-1)} />
            <h1 className="text-2xl font-light">{formatLong(selected)}</h1>
            <IconButton name="chevronL" label="היום הבא" onClick={() => go(1)} />
          </div>
          <div className="flex items-center gap-2">
            <Link to="/calendar" className="btn gap-2 text-navy"><Icon name="calendar" size={18} />חזרה ללוח</Link>
            <IconButton name="plus" label="הוספת אירוע ליום הזה" tone="primary" size={20} className="!h-10 !w-10" onClick={() => app.newManual(selected)} />
          </div>
        </div>
        {dayMarks.length > 0 && (
          <ul className="m-0 grid list-none gap-2 p-0" aria-label="אבני דרך ביום הזה">
            {dayMarks.map((m, i) => (
              <li key={i} className={`flex items-start gap-2 rounded-lg border-2 border-dashed border-navy bg-white p-2.5 ${m.done ? 'text-mute line-through' : ''}`}>
                <Icon name={m.done ? 'check' : 'diamond'} size={16} className="mt-1 shrink-0 text-navy" />
                <span className="min-w-0 break-words"><b className="text-[#111111]">{m.name}</b><br /><span className="text-sm text-mute">אבן דרך בפרויקט {m.projectName}</span></span>
              </li>
            ))}
          </ul>
        )}
        {loading ? (
          <div className="skeleton h-24" />
        ) : day.length > 0 ? (
          <div className="grid gap-2">
            {day.map((e) => <EventCard key={e.id} event={e} flash={flashId === e.id} onOpen={() => setOpen(e)} />)}
          </div>
        ) : dayMarks.length === 0 && (
          <div className="rounded-lg bg-soft p-4 text-mute">
            <p>אין אירועים ביום הזה.</p>
            <p className="mt-1 text-sm">הכפתור + מוסיף אירוע ישר לתאריך.</p>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-4">
        <UploadZone onFile={app.fromFile} onPaste={app.openPaste} onPick={app.pickFile} onVoice={app.openVoice} busy={uploading} step={step} />
        <TaskList />
      </div>

      {openLive && <EventModal event={openLive} onClose={() => setOpen(null)} />}
    </div>
  )
}
