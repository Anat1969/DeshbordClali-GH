import { useEffect, useMemo, useState } from 'react'
import CalendarMonthView from '../components/CalendarMonthView'
import TimeGrid from '../components/TimeGrid'
import EventModal from '../components/EventModal'
import UploadZone from '../components/UploadZone'
import { IconButton } from '../components/Icon'
import { useLocation } from 'react-router-dom'
import { useApp } from '../lib/ctx'
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
  // אפשר להגיע עם יום נבחר (מהלוח הקטן בדף הבית)
  const startDay = (useLocation().state as { day?: string } | null)?.day
  const [selected, setSelected] = useState(startDay ?? todayIso())
  const [open, setOpen] = useState<CalEvent | null>(null)

  // לחיצה על הלוגו (גם כשכבר בדף הבית) מחזירה להיום
  const loc = useLocation()
  useEffect(() => {
    setAnchor(startDay ?? todayIso())
    setSelected(startDay ?? todayIso())
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="mx-auto flex w-full flex-1 flex-col gap-3 px-4 py-3 sm:px-6 lg:min-h-0">
      {/* מסקנה קודם: מה האירוע הבא, בשורה אחת */}
      <div>
        {loading ? (
          <div className="skeleton h-8 w-2/3" />
        ) : next ? (
          <h1 className="m-0 text-xl font-light leading-snug sm:text-2xl">
            האירוע הבא: <mark className="marker font-semibold">{next.title}</mark>, {relativeDays(next.event_date)}
            <span className="ms-2 font-semibold">
              {formatShort(next.event_date)}
              {next.event_time ? ` בשעה ${formatTime(next.event_time)}` : ''}
            </span>
            {next.location && <span className="text-base text-mute sm:text-lg">{`, ${next.location}`}</span>}
          </h1>
        ) : (
          <h1 className="m-0 text-xl font-light sm:text-2xl">היומן ריק, <b>זרקי מסמך</b> והוא יתמלא. הפרטים יחולצו לאישורך.</h1>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#FBECEA] p-3 text-bad" role="alert">
          <span>טעינת האירועים נכשלה. בדקי חיבור ונסי שוב.</span>
          <button type="button" className="btn" onClick={reload}>ניסיון חוזר</button>
        </div>
      )}

      {/* שני שלישים ליומן ושליש ליום שנבחר */}
      <div className="flex flex-1 flex-col lg:grid lg:min-h-0 gap-4 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)]">
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

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:col-span-1 lg:min-h-0">
          <UploadZone compact onFile={app.fromFile} onPaste={app.openPaste} onPick={app.pickFile} onVoice={app.openVoice} busy={uploading} step={step} />
          <section aria-label="היום שנבחר" className="flex min-h-[460px] flex-1 flex-col lg:min-h-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xl font-light">{formatLong(selected)}</h2>
              <IconButton name="plus" label="הוספת אירוע ליום הזה" tone="primary" size={20} className="!h-10 !w-10" onClick={() => app.newManual(selected)} />
            </div>
            <TimeGrid single days={[selected]} events={events} milestones={milestones} selected={selected} nextId={next?.id ?? null} flashId={flashId} onSelect={setSelected} onAdd={(iso, time) => app.newManual(iso, time)} onOpenEvent={setOpen} />
          </section>
        </aside>
      </div>

      {openLive && <EventModal event={openLive} onClose={() => setOpen(null)} />}
    </div>
  )
}
