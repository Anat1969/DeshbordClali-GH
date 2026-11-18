import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CalEvent } from '../types'
import { HE_DAYS_SHORT, HE_MONTHS, addMonths, monthGrid, todayIso, parseIso } from '../lib/dateUtils'
import Icon from './Icon'

// לוח שנה קטן: חודש אחד, נקודה בימים שיש בהם פעילות (אירוע או אבן דרך), והיום במרקר. לחיצה על יום פותחת אותו ביומן
export default function MiniCalendar({ events, marked }: { events: CalEvent[]; marked: Set<string> }) {
  const nav = useNavigate()
  const today = todayIso()
  const t = parseIso(today)
  const [view, setView] = useState({ y: t.y, m: t.m })
  const cells = useMemo(() => monthGrid(view.y, view.m), [view])
  const busy = useMemo(() => {
    const s = new Set(marked)
    for (const e of events) s.add(e.event_date)
    return s
  }, [events, marked])
  const step = (d: number) => setView((v) => addMonths(v.y, v.m, d))

  return (
    <div className="w-[216px] shrink-0 select-none" role="group" aria-label={`לוח שנה קטן, ${HE_MONTHS[view.m]} ${view.y}`}>
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="rounded p-1 hover:bg-soft" aria-label="חודש קודם" onClick={() => step(-1)}><Icon name="chevronR" size={16} /></button>
        <span className="text-sm font-semibold">{HE_MONTHS[view.m]} <span className="num">{view.y}</span></span>
        <button type="button" className="rounded p-1 hover:bg-soft" aria-label="חודש הבא" onClick={() => step(1)}><Icon name="chevronL" size={16} /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-mute">
        {HE_DAYS_SHORT.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 text-center">
        {cells.map((c) => {
          const isToday = c.iso === today
          const has = busy.has(c.iso)
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => nav('/calendar', { state: { day: c.iso } })}
              title={has ? 'יש פעילות ביום הזה' : undefined}
              aria-label={`${c.iso}${has ? ', יש פעילות' : ''}`}
              className={`num relative h-8 text-[13px] hover:bg-soft ${c.inMonth ? '' : 'text-[#B4B8C0]'} ${isToday ? 'marker font-semibold' : ''}`}
            >
              {parseIso(c.iso).d}
              {has && <span className="absolute inset-x-0 bottom-0.5 mx-auto h-1.5 w-1.5 rounded-full bg-navy" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
