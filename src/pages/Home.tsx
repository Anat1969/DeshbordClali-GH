import { useEffect, useMemo, useState } from 'react'
import CalendarMonthView from '../components/CalendarMonthView'
import EventCard from '../components/EventCard'
import EventModal from '../components/EventModal'
import UploadZone from '../components/UploadZone'
import Icon, { IconButton } from '../components/Icon'
import QuickLinks from '../components/QuickLinks'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../lib/ctx'
import TaskList from '../components/TaskList'
import { VIEW_STEP, addDays, daysUntil, formatLong, formatShort, formatTime, relativeDays, todayIso, type ViewMode } from '../lib/dateUtils'
import { milestoneMap } from '../lib/projects'
import type { CalEvent } from '../types'

// הבית: כותרת עם המסקנה, לוח חודשי, ומימין פאנל של היום שנבחר והעלאה
export default function Home({ uploading, step }: { uploading: boolean; step: string }) {
  const app = useApp()
  const { events, loading, error, flashId, reload } = app.ev
  // העוגן הוא מרכז החלון. ברירת מחדל: היום
  const [anchor, setAnchor] = useState(todayIso())
  const [mode, setModeState] = useState<ViewMode>(() => {
    try {
      const m = localStorage.getItem('yoman_view_v1')
      return m === 'day' || m === 'week' || m === 'month' || m === 'bimonth' || m === 'quarter' ? m : 'month'
    } catch {
      return 'month'
    }
  })
  const setMode = (m: ViewMode) => {
    setModeState(m)
    try { localStorage.setItem('yoman_view_v1', m) } catch { /* אחסון חסום */ }
  }
  const [selected, setSelected] = useState(todayIso())
  const [open, setOpen] = useState<CalEvent | null>(null)

  // לחיצה על הלוגו (גם כשכבר בדף הבית) מחזירה להיום
  const loc = useLocation()
  useEffect(() => {
    setAnchor(todayIso())
    setSelected(todayIso())
  }, [loc.key])

  // אבני דרך של פרויקטים, לפי תאריך
  const milestones = useMemo(() => milestoneMap(app.projects.projects), [app.projects.projects])
  const dayMarks = milestones.get(selected) ?? []

  const next = useMemo(() => events.find((e) => daysUntil(e.event_date) >= 0), [events])
  const day = events.filter((e) => e.event_date === selected)
  // החלון תמיד מציג את הגרסה העדכנית של האירוע
  const openLive = open ? events.find((e) => e.id === open.id) ?? null : null

  const go = (dir: number) => setAnchor((a) => addDays(a, dir * VIEW_STEP[mode]))
  const toToday = () => {
    setAnchor(todayIso())
    setSelected(todayIso())
  }

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:min-h-0">
      {/* מסקנה קודם: מה האירוע הבא */}
      <div>
        {loading ? (
          <div className="skeleton h-9 w-2/3" />
        ) : next ? (
          <>
            <h1 className="text-2xl font-light sm:text-3xl">
              האירוע הבא: <mark className="marker font-semibold">{next.title}</mark>, {relativeDays(next.event_date)}
            </h1>
            {/* שורת התאריך של האירוע הבא: גדולה, ומהבהבת כמה פעמים */}
            <p className="blink mt-1.5 text-xl font-semibold sm:text-3xl" aria-live="polite">
              {formatShort(next.event_date)}
              {next.event_time ? ` בשעה ${formatTime(next.event_time)}` : ''}
              {next.location && <span className="text-base font-normal text-mute sm:text-xl">{`, ${next.location}`}</span>}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-light sm:text-3xl">היומן ריק, <b>זרקי מסמך</b> והוא יתמלא</h1>
            <p className="mt-1 text-mute">הפרטים יחולצו ויוצגו לאישור לפני שמירה.</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#FBECEA] p-3 text-bad" role="alert">
          <span>טעינת האירועים נכשלה. בדקי חיבור ונסי שוב.</span>
          <button type="button" className="btn" onClick={reload}>ניסיון חוזר</button>
        </div>
      )}

      {/* קישורים חשובים ומסך עבודה */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <QuickLinks />
        <Link to="/work" className="btn gap-2 text-navy"><Icon name="spark" size={18} />מסך עבודה</Link>
      </div>

      {/* יחס שני שלישים ליומן ושליש למשימות */}
      <div className="flex flex-1 flex-col gap-6 lg:grid lg:min-h-0 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)]">
        <div className="flex min-h-[420px] flex-1 flex-col lg:col-span-2 lg:min-h-0">
          {loading ? (
            <div className="skeleton flex-1" />
          ) : (
            <CalendarMonthView
              mode={mode}
              anchor={anchor}
              events={events}
              selected={selected}
              flashId={flashId}
              nextId={next?.id ?? null}
              milestones={milestones}
              onAdd={(iso) => (setSelected(iso), app.newManual(iso))}
              onMode={setMode}
              onSelect={setSelected}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
              onToday={toToday}
              onOpenEvent={setOpen}
            />
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:col-span-1 lg:min-h-0 lg:overflow-auto">
          <UploadZone onFile={app.fromFile} onPaste={app.openPaste} onPick={app.pickFile} onVoice={app.openVoice} busy={uploading} step={step} />
          <section aria-label="אירועי היום שנבחר">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-light">{formatLong(selected)}</h2>
              <IconButton name="plus" label="הוספת אירוע ליום הזה" tone="primary" size={20} className="!h-10 !w-10" onClick={() => app.newManual(selected)} />
            </div>
            {dayMarks.length > 0 && (
              <ul className="m-0 mb-2 grid list-none gap-2 p-0" aria-label="אבני דרך ביום הזה">
                {dayMarks.map((m, i) => (
                  <li key={i} className={`flex items-start gap-2 rounded-lg border-2 border-dashed border-navy bg-white p-2.5 ${m.done ? 'text-mute line-through' : ''}`}>
                    <Icon name={m.done ? 'check' : 'diamond'} size={16} className="mt-1 shrink-0 text-navy" />
                    <span className="min-w-0 break-words"><b className="text-[#111111]">{m.name}</b><br /><span className="text-sm text-mute">אבן דרך בפרויקט {m.projectName}</span></span>
                  </li>
                ))}
              </ul>
            )}
            {day.length > 0 ? (
              <div className="grid gap-2">
                {day.map((e) => (
                  <EventCard key={e.id} event={e} flash={flashId === e.id} onOpen={() => setOpen(e)} />
                ))}
              </div>
            ) : dayMarks.length === 0 && (
              <div className="rounded-lg bg-soft p-4 text-mute">
                <p>אין אירועים ביום הזה.</p>
                <p className="mt-1 text-sm">לחיצה כפולה על יום בלוח, או על +, מוסיפה אירוע ישר לתאריך.</p>
              </div>
            )}
          </section>
          <TaskList />
        </aside>
      </div>

      {openLive && <EventModal event={openLive} onClose={() => setOpen(null)} />}
    </div>
  )
}
