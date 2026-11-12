import { useMemo, useState } from 'react'
import CalendarMonthView from '../components/CalendarMonthView'
import EventCard from '../components/EventCard'
import EventModal from '../components/EventModal'
import UploadZone from '../components/UploadZone'
import { useApp } from '../lib/ctx'
import { addMonths, daysUntil, formatLong, formatShort, formatTime, parseIso, relativeDays, todayIso } from '../lib/dateUtils'
import type { CalEvent } from '../types'

// הבית: כותרת עם המסקנה, לוח חודשי, ומימין פאנל של היום שנבחר והעלאה
export default function Home({ uploading, step }: { uploading: boolean; step: string }) {
  const app = useApp()
  const { events, loading, error, flashId, reload } = app.ev
  const t = parseIso(todayIso())
  const [view, setView] = useState({ y: t.y, m: t.m })
  const [selected, setSelected] = useState(todayIso())
  const [open, setOpen] = useState<CalEvent | null>(null)

  const next = useMemo(() => events.find((e) => daysUntil(e.event_date) >= 0), [events])
  const day = events.filter((e) => e.event_date === selected)
  // החלון תמיד מציג את הגרסה העדכנית של האירוע
  const openLive = open ? events.find((e) => e.id === open.id) ?? null : null

  const go = (delta: number) => setView((v) => addMonths(v.y, v.m, delta))
  const toToday = () => {
    setView({ y: t.y, m: t.m })
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
              האירוע הבא: <b>{next.title}</b>, {relativeDays(next.event_date)}
            </h1>
            <p className="mt-1 text-mute">
              {formatShort(next.event_date)}
              {next.event_time ? ` בשעה ${formatTime(next.event_time)}` : ''}
              {next.location ? `, ${next.location}` : ''}
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

      <div className="flex flex-1 flex-col gap-6 lg:min-h-0 lg:flex-row">
        <div className="flex min-h-[420px] flex-1 flex-col lg:min-h-0">
          {loading ? (
            <div className="skeleton flex-1" />
          ) : (
            <CalendarMonthView
              year={view.y}
              month={view.m}
              events={events}
              selected={selected}
              flashId={flashId}
              onSelect={setSelected}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
              onToday={toToday}
              onOpenEvent={setOpen}
            />
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 lg:min-h-0 lg:w-[380px] lg:overflow-auto">
          <UploadZone onFile={app.fromFile} onPaste={app.openPaste} onPick={app.pickFile} busy={uploading} step={step} />
          <section aria-label="אירועי היום שנבחר">
            <h2 className="mb-3 text-lg font-light">{formatLong(selected)}</h2>
            {day.length > 0 ? (
              <div className="grid gap-2">
                {day.map((e) => (
                  <EventCard key={e.id} event={e} flash={flashId === e.id} onOpen={() => setOpen(e)} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-soft p-4 text-mute">
                <p>אין אירועים ביום הזה.</p>
                <button type="button" className="mt-2 text-navy underline underline-offset-4" onClick={app.newManual}>הוספת אירוע ידני</button>
              </div>
            )}
          </section>
        </aside>
      </div>

      {openLive && <EventModal event={openLive} onClose={() => setOpen(null)} />}
    </div>
  )
}
