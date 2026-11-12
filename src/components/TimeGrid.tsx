import { useEffect, useMemo, useRef } from 'react'
import type { CalEvent } from '../types'
import Icon from './Icon'
import type { MilestoneMark } from '../lib/projects'
import { slotOf } from '../lib/categories'
import { HE_DAYS_FULL, formatShort, todayIso, weekdayOf } from '../lib/dateUtils'

const HOUR = 44 // גובה שעה בפיקסלים
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const pad = (n: number) => String(n).padStart(2, '0')

interface Props {
  days: string[]
  events: CalEvent[]
  milestones: Map<string, MilestoneMark[]>
  selected: string
  nextId: string | null
  flashId: string | null
  onSelect: (iso: string) => void
  onAdd: (iso: string, time?: string) => void
  onOpenEvent: (e: CalEvent) => void
  single?: boolean // בתצוגת יום: לחיצה אחת על משבצת שעה מוסיפה אירוע
}

// רשת שעות ליום ולשבוע: שורה לכל שעה, אירועים עם שעה ממוקמים לפי השעה, ואירועים בלי שעה בשורת "כל היום".
// לחיצה כפולה על שעה פותחת אירוע חדש באותו יום ובאותה שעה
export default function TimeGrid({ days, events, milestones, selected, nextId, flashId, onSelect, onAdd, onOpenEvent, single }: Props) {
  const today = todayIso()
  const scroller = useRef<HTMLDivElement>(null)
  const cols = `3.2rem repeat(${days.length}, minmax(0, 1fr))`

  const byDay = useMemo(() => {
    const m = new Map<string, { allDay: CalEvent[]; timed: { e: CalEvent; col: number; of: number }[] }>()
    for (const iso of days) {
      const list = events.filter((e) => e.event_date === iso)
      const timed = list.filter((e) => e.event_time).sort((a, b) => (a.event_time! < b.event_time! ? -1 : 1))
      // חפיפות: אירועים באותה שעה מתחלקים לעמודות זה לצד זה
      const placed: { e: CalEvent; col: number; of: number }[] = []
      let group: typeof placed = []
      let groupEnd = -1
      const flush = () => { const n = Math.max(1, ...group.map((g) => g.col + 1)); group.forEach((g) => (g.of = n)); placed.push(...group); group = [] }
      for (const e of timed) {
        const start = Number(e.event_time!.slice(0, 2)) * 60 + Number(e.event_time!.slice(3, 5))
        if (group.length && start >= groupEnd) flush()
        const used = new Set(group.filter((g) => Number(g.e.event_time!.slice(0, 2)) * 60 + Number(g.e.event_time!.slice(3, 5)) + 60 > start).map((g) => g.col))
        let col = 0
        while (used.has(col)) col++
        group.push({ e, col, of: 1 })
        groupEnd = Math.max(groupEnd, start + 60)
      }
      flush()
      m.set(iso, { allDay: list.filter((e) => !e.event_time), timed: placed })
    }
    return m
  }, [days, events])

  // גלילה ראשונית: שעה לפני האירוע הראשון, או 07:00
  useEffect(() => {
    const first = Math.min(...days.flatMap((d) => (byDay.get(d)?.timed ?? []).map((t) => Number(t.e.event_time!.slice(0, 2)))), 8)
    if (scroller.current) scroller.current.scrollTop = Math.max(0, first - 1) * HOUR
  }, [days, byDay])

  // לחיצה על משבצת: השעה נקבעת לפי המיקום בתוך העמודה
  const slotAdd = (iso: string) => (ev: React.MouseEvent<HTMLDivElement>) => {
    const r = ev.currentTarget.getBoundingClientRect()
    onAdd(iso, `${pad(Math.min(23, Math.max(0, Math.floor((ev.clientY - r.top) / HOUR))))}:00`)
  }

  const now = new Date()
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-white" style={{ border: '2px solid #C6CCD6' }}>
      {/* כותרות ימים */}
      <div className="grid border-b border-[#E3E6EB]" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((iso) => (
          <button key={iso} type="button" onClick={() => onSelect(iso)} className={`px-1 py-1.5 text-center ${iso === selected ? 'shadow-[inset_0_-4px_0_#1A2B4A]' : ''} ${iso === today ? 'bg-[#F2F3F5] font-semibold' : ''}`}>
            <span className="block text-base">{HE_DAYS_FULL[weekdayOf(iso)]}</span>
            <span className="num block text-sm text-mute">{formatShort(iso)}</span>
          </button>
        ))}
      </div>

      {/* כל היום: אירועים בלי שעה ואבני דרך */}
      <div className="grid border-b-2 border-[#C6CCD6]" style={{ gridTemplateColumns: cols }}>
        <div className="flex items-center justify-center text-xs text-mute">כל היום</div>
        {days.map((iso) => (
          <div key={iso} className="flex min-h-9 flex-col gap-1 border-s border-[#E3E6EB] p-1" onClick={single ? () => onAdd(iso) : undefined} onDoubleClick={single ? undefined : () => onAdd(iso)} title={single ? 'לחיצה: הוספת אירוע' : 'לחיצה כפולה: הוספת אירוע'}>
            {(milestones.get(iso) ?? []).map((m, i) => (
              <div key={i} className={`flex items-start gap-1 rounded border-2 border-dashed border-navy bg-white/70 px-1 text-xs ${m.done ? 'text-mute line-through' : ''}`}>
                <Icon name="diamond" size={11} className="mt-0.5 shrink-0 text-navy" /><span className="break-words">{m.name}</span>
              </div>
            ))}
            {byDay.get(iso)?.allDay.map((e) => <EventChip key={e.id} e={e} next={e.id === nextId} flash={e.id === flashId} onOpen={onOpenEvent} />)}
          </div>
        ))}
      </div>

      {/* שורות שעות */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto">
        <div className="relative grid" style={{ gridTemplateColumns: cols, height: 24 * HOUR }}>
          <div>
            {HOURS.map((h) => <div key={h} className="num relative text-xs text-mute" style={{ height: HOUR }}><span className="absolute -top-2 start-1 bg-white px-0.5">{h > 0 ? `${pad(h)}:00` : ''}</span></div>)}
          </div>
          {days.map((iso) => {
            const wk = weekdayOf(iso)
            return (
              <div key={iso} className="relative border-s border-[#E3E6EB]" style={{ background: wk === 5 || wk === 6 ? '#F3F4F6' : undefined }}
                onClick={single ? slotAdd(iso) : undefined}
                onDoubleClick={single ? undefined : slotAdd(iso)}
                title={single ? 'לחיצה על שעה: הוספת אירוע בשעה הזו' : 'לחיצה כפולה על שעה: הוספת אירוע בשעה הזו'}>
                {HOURS.map((h) => <div key={h} className="border-t border-[#E3E6EB]" style={{ height: HOUR }} />)}
                {iso === today && <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-bad" style={{ top: nowTop }}><span className="absolute -top-1.5 end-0 h-3 w-3 rounded-full bg-bad" /></div>}
                {byDay.get(iso)?.timed.map(({ e, col, of }) => {
                  const [h, mi] = e.event_time!.split(':').map(Number)
                  return (
                    <div key={e.id} className="absolute p-px" style={{ top: (h + mi / 60) * HOUR, height: HOUR - 2, insetInlineStart: `${(col * 100) / of}%`, width: `${100 / of}%` }}>
                      <EventChip e={e} next={e.id === nextId} flash={e.id === flashId} onOpen={onOpenEvent} fill />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EventChip({ e, next, flash, onOpen, fill }: { e: CalEvent; next: boolean; flash: boolean; onOpen: (e: CalEvent) => void; fill?: boolean }) {
  const sl = slotOf(e.category)
  return (
    <button
      type="button"
      onClick={(ev) => { ev.stopPropagation(); onOpen(e) }}
      onDoubleClick={(ev) => ev.stopPropagation()}
      style={{ background: sl?.color ?? '#1A2B4A', color: sl?.fg ?? '#FFFFFF', boxShadow: next ? '0 0 0 3px #FFE066' : undefined }}
      className={`flex w-full items-start gap-1 overflow-hidden rounded-md px-1.5 py-0.5 text-right text-xs leading-snug hover:opacity-85 ${fill ? 'h-full' : ''} ${flash ? 'flash' : ''}`}
      title={e.title}
    >
      {e.event_time && <span className="num shrink-0 opacity-80">{e.event_time.slice(0, 5)}</span>}
      <span className="min-w-0 break-words">{e.title}</span>
    </button>
  )
}
