import { useMemo } from 'react'
import type { CalEvent } from '../types'
import CategoryLegend from './CategoryLegend'
import TimeGrid from './TimeGrid'
import Icon, { IconButton } from './Icon'
import type { MilestoneMark } from '../lib/projects'
import { SLOTS, slotOf } from '../lib/categories'
import {
  HE_DAYS_FULL, HE_DAYS_SHORT, HE_MONTHS, VIEW_LABEL, formatRange, formatShort, parseIso, todayIso, weekdayOf, windowDays,
  type ViewMode,
} from '../lib/dateUtils'

interface Props {
  mode: ViewMode
  anchor: string
  events: CalEvent[]
  selected: string
  flashId: string | null
  nextId: string | null
  milestones: Map<string, MilestoneMark[]>
  onMode: (m: ViewMode) => void
  onSelect: (iso: string) => void
  onAdd: (iso: string, time?: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onOpenEvent: (e: CalEvent) => void
}

const MODES: ViewMode[] = ['day', 'week', 'month', 'bimonth', 'quarter']
const HAIR = '#E3E6EB' // קו דק בין ימים
const WEEK_FRAME = '#C6CCD6' // מסגרת שבוע
const MONTH_LINE = '#1A2B4A' // גבול חודש
const WEEKEND_BG = '#ECEEF1' // שישי ושבת

// לוח מתגלגל: יום, שבוע, חודש, חודשיים או שלושה חודשים, תמיד כשהעוגן ("היום") במרכז החלון
export default function CalendarMonthView({ mode, anchor, events, selected, flashId, nextId, milestones, onMode, onSelect, onAdd, onPrev, onNext, onToday, onOpenEvent }: Props) {
  const days = useMemo(() => windowDays(anchor, mode), [anchor, mode])
  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) m.set(e.event_date, [...(m.get(e.event_date) ?? []), e])
    return m
  }, [events])
  const today = todayIso()
  const isGrid = mode === 'month' || mode === 'bimonth' || mode === 'quarter'
  const rows = Math.ceil(days.length / 7)
  // ימי השבוע תמיד מיום ראשון. העמודה של היום מסומנת
  const heads = [0, 1, 2, 3, 4, 5, 6]
  const todayDow = weekdayOf(today)
  const monthOf = (iso: string) => iso.slice(0, 7)
  const dense = mode === 'quarter' || mode === 'bimonth'

  const cell = (iso: string, idx: number) => {
    const list = byDate.get(iso) ?? []
    const marks = milestones.get(iso) ?? []
    const isSel = iso === selected
    const isToday = iso === today
    const dow = weekdayOf(iso)
    const weekend = dow === 5 || dow === 6
    const { m, d } = parseIso(iso)
    const slotsHere = SLOTS.filter((sl) => list.some((e) => e.category === sl.key))
    // רקע היום: רק "היום" צבוע בצהוב. שאר הימים לבנים (אפור בהיר בשישי ושבת), כי האירועים עצמם כבר נושאים את צבע הקטגוריה
    const base = weekend ? WEEKEND_BG : '#FFFFFF'
    const background = isToday ? `linear-gradient(#FFEE8C, #FFEE8C)` : isSel ? '#E8ECF4' : base
    const big = mode === 'day' || mode === 'week'
    // בתחילת חודש ובתא הראשון מציגים את שם החודש
    const label = isGrid ? (d === 1 || idx === 0 ? `${d} ${HE_MONTHS[m].slice(0, 3)}` : String(d)) : formatShort(iso)

    // גבולות: קו דק בין ימים, וקו עבה בגבול חודש. כל קצה שייך לתא אחד
    const col = idx % 7
    const style: React.CSSProperties = { background, touchAction: 'manipulation' }
    if (isGrid) {
      if (col !== 0) style.borderRight = `${monthOf(days[idx - 1]) === monthOf(iso) ? 1 : 3}px solid ${monthOf(days[idx - 1]) === monthOf(iso) ? HAIR : MONTH_LINE}`
      if (idx >= 7 && monthOf(days[idx - 7]) !== monthOf(iso)) style.borderTop = `3px solid ${MONTH_LINE}`
    }
    if (isSel) style.boxShadow = 'inset 0 -4px 0 #1A2B4A'
    // היום: מסגרת שחורה
    if (isToday) {
      style.outline = '4px solid #E6B800'
      style.outlineOffset = '-3px'
      style.position = 'relative'
      style.zIndex = 1
    }

    const iconSize = big ? 18 : dense ? 12 : 15
    return (
      <div
        key={iso}
        role="gridcell"
        tabIndex={0}
        aria-selected={isSel}
        data-today={isToday || undefined}
        data-weekend={weekend || undefined}
        aria-label={`${formatShort(iso)}${list.length ? `, ${list.length} אירועים` : ''}${marks.length ? `, ${marks.length} אבני דרך` : ''}. לחיצה כפולה להוספת אירוע`}
        title="לחיצה כפולה: הוספת אירוע ליום הזה"
        style={style}
        onClick={() => onSelect(iso)}
        onDoubleClick={() => onAdd(iso)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(iso))}
        className={`group flex min-h-12 min-w-0 cursor-pointer flex-col p-1.5 transition-colors ${big ? 'rounded-lg border sm:p-2.5' : ''}`}
      >
        <div className={`flex gap-1 ${big ? 'items-start justify-between' : 'flex-col items-center sm:flex-row sm:items-start sm:justify-between'}`}>
          <span className={`num text-sm ${big ? 'text-base sm:text-lg' : ''} ${isToday ? 'text-base font-semibold sm:text-lg' : iso < today && !isSel ? 'text-mute' : ''}`}>{label}</span>
          <span className="flex items-center gap-0.5">
            {marks.length > 0 && <Icon name="diamond" size={iconSize} style={{ color: '#1A2B4A' }} />}
            {slotsHere.map((sl) => (
              <Icon key={sl.key} name={sl.icon} size={iconSize} style={{ color: sl.ink }} />
            ))}
            {!slotsHere.length && list.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-navy" />}
            {!dense && (
              <IconButton
                name="plus"
                label={`הוספת אירוע ב${formatShort(iso)}`}
                size={14}
                className={`!h-6 !w-6 ${isSel || big ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd(iso)
                }}
              />
            )}
          </span>
        </div>
        {isToday && big && <span className="marker mt-0.5 self-start text-sm font-semibold">היום</span>}

        {mode !== 'quarter' && (
          <div className={`mt-1 flex-col gap-1 ${big ? 'flex' : 'hidden sm:flex'}`}>
            {/* אבני דרך של פרויקטים: מסגרת מקווקווה עם יהלום, כדי להבדיל מאירוע */}
            {marks.map((m, i) => (
              <div key={`ms-${i}`} className={`flex items-start gap-1.5 rounded-md border-2 border-dashed border-navy bg-white/70 px-1.5 py-1 text-xs leading-snug sm:text-sm ${m.done ? 'text-mute line-through' : 'text-[#111111]'}`} title={`אבן דרך בפרויקט ${m.projectName}`}>
                <Icon name={m.done ? 'check' : 'diamond'} size={13} className="mt-0.5 shrink-0 text-navy" />
                <span className="min-w-0 break-words"><b>{m.name}</b> <span className="text-mute">· {m.projectName}</span></span>
              </div>
            ))}
            {list.map((e) => {
              const sl = slotOf(e.category)
              const isNext = e.id === nextId
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onOpenEvent(e)
                  }}
                  onDoubleClick={(ev) => ev.stopPropagation()}
                  style={{ background: sl?.color ?? '#1A2B4A', color: sl?.fg ?? '#FFFFFF', boxShadow: isNext ? '0 0 0 3px #FFE066' : undefined }}
                  className={`flex items-start gap-1.5 rounded-md px-1.5 py-1 text-right text-xs leading-snug hover:opacity-85 sm:text-sm ${flashId === e.id ? 'flash' : ''}`}
                  title={e.title}
                >
                  {e.event_time && <span className="num shrink-0 opacity-80">{e.event_time.slice(0, 5)}</span>}
                  <span className="min-w-0 break-words">{e.title}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const minRow = mode === 'quarter' ? 44 : mode === 'bimonth' ? 52 : 56

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={`לוח שנה, ${VIEW_LABEL[mode]}`}>
      {/* שורה אחת: הקודם, הטווח, הבא, חזרה להיום, ובצד השני בורר התצוגה */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5">
          <button type="button" className="btn !min-h-9 !px-2.5" aria-label="הקודם" title="הקודם" onClick={onPrev}><Icon name="chevronR" size={20} /></button>
          <h2 className="m-0 min-w-[9.5rem] text-center text-lg font-light leading-tight sm:text-xl">
            <span className="num">{formatRange(days[0], days[days.length - 1])}</span>
          </h2>
          <button type="button" className="btn !min-h-9 !px-2.5" aria-label="הבא" title="הבא" onClick={onNext}><Icon name="chevronL" size={20} /></button>
          <button type="button" className="inline-flex items-center gap-1 px-1 text-sm text-navy underline underline-offset-4" onClick={onToday}><Icon name="target" size={14} />היום</button>
        </div>
        <div className="ms-auto grid grid-cols-5 gap-1" role="group" aria-label="תצוגה">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => onMode(m)}
              className={`btn !min-h-9 !px-2 text-[13px] whitespace-nowrap sm:!px-3 sm:text-sm ${mode === m ? 'btn-primary' : ''}`}
            >
              {VIEW_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      <div role="grid" className="flex min-h-0 flex-1 flex-col">
        {/* ימי השבוע: גדולים ובולטים, היום האמצעי מסומן, ושישי ושבת באפור */}
        {mode !== 'day' && (
          <div role="row" className={`grid-cols-7 pb-1.5 text-center ${mode === 'week' ? 'hidden' : 'grid'}`}>
            {heads.map((dow, i) => (
              <div key={i} role="columnheader" className={`text-base font-semibold ${dow === todayDow ? 'text-ink' : dow === 5 || dow === 6 ? 'text-mute' : 'text-ink'}`}>
                <span className="sm:hidden">{HE_DAYS_SHORT[dow]}</span>
                <span className="hidden sm:inline">{HE_DAYS_FULL[dow]}</span>
                {dow === todayDow && <span className="block h-1 rounded bg-[#111111]" aria-hidden="true" />}
              </div>
            ))}
          </div>
        )}

        {/* מחשב: רשת שעות ליום ולשבוע */}
        {(mode === 'day' || mode === 'week') && (
          <div className={`min-h-0 flex-1 ${mode === 'day' ? 'flex' : 'hidden sm:flex'}`}>
            <TimeGrid single={mode === 'day'} days={days} events={events} milestones={milestones} selected={selected} nextId={nextId} flashId={flashId} onSelect={onSelect} onAdd={onAdd} onOpenEvent={onOpenEvent} />
          </div>
        )}


        {/* שבוע: מסגרת אחת סביב כל השבוע, ומסגרת לכל יום */}
        {mode === 'week' && (
          <div className="min-h-0 flex-1 overflow-auto rounded-lg p-1.5 sm:hidden" style={{ border: `2px solid ${WEEK_FRAME}` }}>
            <div className="grid h-full grid-cols-1 gap-1.5 sm:grid-cols-7 sm:grid-rows-1">{days.map(cell)}</div>
          </div>
        )}

        {/* חודש, חודשיים, 3 חודשים: מסגרת לכל שבוע (שורה), וקו עבה בגבול כל חודש */}
        {isGrid && (
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="grid shrink-0 grid-cols-7 overflow-clip rounded-lg" style={{ border: `2px solid ${WEEK_FRAME}`, flex: `1 0 ${minRow}px` }}>
                {days.slice(r * 7, r * 7 + 7).map((iso, c) => cell(iso, r * 7 + c))}
              </div>
            ))}
          </div>
        )}
      </div>
      <CategoryLegend />
    </section>
  )
}
