import { useEffect, useMemo, useState } from 'react'
import CalendarMonthView from '../components/CalendarMonthView'
import EventModal from '../components/EventModal'
import Icon from '../components/Icon'
import QuickLinks from '../components/QuickLinks'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../lib/ctx'
import { VIEW_STEP, addDays, daysUntil, formatShort, formatTime, relativeDays, todayIso, type ViewMode } from '../lib/dateUtils'
import { milestoneMap } from '../lib/projects'
import type { CalEvent } from '../types'

// הבית: כותרת עם המסקנה ולוח חודשי ברוחב מלא
export default function Home() {
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

  const next = useMemo(() => events.find((e) => daysUntil(e.event_date) >= 0), [events])
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
        <Link to={`/day?d=${selected}`} className="btn gap-2 text-navy"><Icon name="calendar" size={18} />היום שנבחר והעלאה</Link>
        <Link to="/work" className="btn gap-2 text-navy"><Icon name="spark" size={18} />מסך עבודה</Link>
      </div>

      {/* הלוח תופס את כל רוחב המסך. היום שנבחר, ההעלאה והמשימות בדף נפרד */}
      <div className="flex flex-1 flex-col lg:min-h-0">
        <div className="flex min-h-[420px] flex-1 flex-col lg:min-h-0">
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
              onAdd={(iso, time) => (setSelected(iso), app.newManual(iso, time))}
              onMode={setMode}
              onSelect={setSelected}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
              onToday={toToday}
              onOpenEvent={setOpen}
            />
          )}
        </div>

      </div>

      {openLive && <EventModal event={openLive} onClose={() => setOpen(null)} />}
    </div>
  )
}
