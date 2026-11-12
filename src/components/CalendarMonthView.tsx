import { useMemo } from 'react'
import type { CalEvent } from '../types'
import CategoryLegend from './CategoryLegend'
import { SLOTS, slotOf, tint } from '../lib/categories'
import { HE_DAYS_SHORT, HE_MONTHS, monthGrid, todayIso } from '../lib/dateUtils'

interface Props {
  year: number
  month: number
  events: CalEvent[]
  selected: string
  flashId: string | null
  onSelect: (iso: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onOpenEvent: (e: CalEvent) => void
}

// לוח שנה חודשי: גריד 7 על 6, יום הוא תא של 48px לפחות, נקודה כחולה כשיש אירוע
export default function CalendarMonthView({ year, month, events, selected, flashId, onSelect, onPrev, onNext, onToday, onOpenEvent }: Props) {
  const cells = useMemo(() => monthGrid(year, month), [year, month])
  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) m.set(e.event_date, [...(m.get(e.event_date) ?? []), e])
    return m
  }, [events])
  const today = todayIso()

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={`לוח שנה ${HE_MONTHS[month]} ${year}`}>
      {/* כפתורי הקודם והבא במקום קבוע, באותו רוחב */}
      <div className="mb-3 grid grid-cols-[76px_1fr_76px] sm:grid-cols-[88px_1fr_88px] items-center gap-2">
        <button type="button" className="btn" onClick={onPrev}>הקודם</button>
        <div className="flex flex-col items-center">
          <h2 className="whitespace-nowrap text-xl font-light sm:text-2xl">
            {HE_MONTHS[month]} <span className="num">{year}</span>
          </h2>
          <button type="button" className="text-sm text-navy underline underline-offset-4" onClick={onToday}>חזרה להיום</button>
        </div>
        <button type="button" className="btn" onClick={onNext}>הבא</button>
      </div>

      <div role="grid" className="flex min-h-0 flex-1 flex-col">
        <div role="row" className="grid grid-cols-7 pb-1 text-center text-sm text-mute">
          {HE_DAYS_SHORT.map((d) => (
            <div key={d} role="columnheader">{d}</div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1">
          {cells.map((c) => {
            const list = byDate.get(c.iso) ?? []
            const isSel = c.iso === selected
            const isToday = c.iso === today
            // צבע היום: צבע הקטגוריה. כמה קטגוריות באותו יום מוצגות כפסים
            const dayColors = SLOTS.filter((sl) => list.some((e) => e.category === sl.key)).map((sl) => tint(sl.color))
            const dayBg = dayColors.length === 0 ? undefined : dayColors.length === 1 ? dayColors[0] : `linear-gradient(90deg, ${dayColors.map((col, i) => `${col} ${(i * 100) / dayColors.length}% ${((i + 1) * 100) / dayColors.length}%`).join(', ')})`
            return (
              <div
                key={c.iso}
                role="gridcell"
                tabIndex={0}
                aria-selected={isSel}
                aria-label={`${c.day} ב${HE_MONTHS[Number(c.iso.slice(5, 7)) - 1]}${list.length ? `, ${list.length} אירועים` : ''}`}
                style={dayBg ? { background: dayBg } : undefined}
                onClick={() => onSelect(c.iso)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(c.iso))}
                className={`flex min-h-12 cursor-pointer flex-col items-center rounded-lg p-1 transition-colors sm:items-stretch sm:p-1.5 ${
                  isSel ? 'bg-[#E8ECF4] shadow-[inset_0_0_0_2px_#1A2B4A]' : dayBg ? '' : 'hover:bg-soft'
                } ${c.inMonth ? '' : 'opacity-35'}`}
              >
                <span className={`num mx-auto text-sm sm:mx-0 sm:self-start ${isToday ? 'rounded-md bg-navy px-1.5 font-semibold text-white' : isSel ? 'font-semibold' : ''}`}>
                  {c.day}
                </span>
                {/* נייד: נקודות. מסך רחב: כרטיסונים עם שם האירוע */}
                <div className="mt-1 flex gap-1 sm:hidden">
                  {list.slice(0, 3).map((e) => (
                    <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: slotOf(e.category)?.color ?? '#1A2B4A' }} />
                  ))}
                </div>
                <div className="mt-1 hidden min-h-0 flex-col gap-1 overflow-hidden sm:flex">
                  {list.slice(0, 2).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onOpenEvent(e)
                      }}
                      style={{ background: slotOf(e.category)?.color ?? '#1A2B4A', color: slotOf(e.category)?.fg ?? '#FFFFFF' }}
                      className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-right text-xs hover:opacity-85 ${flashId === e.id ? 'flash' : ''}`}
                      title={e.title}
                    >
                      {e.event_time && <span className="num shrink-0 opacity-75">{e.event_time.slice(0, 5)}</span>}
                      <span className="truncate">{e.title}</span>
                    </button>
                  ))}
                  {list.length > 2 && <span className="text-xs text-mute">ועוד {list.length - 2}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <CategoryLegend />
    </section>
  )
}
