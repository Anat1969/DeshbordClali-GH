import { useMemo } from 'react'
import type { CalEvent } from '../types'
import CategoryLegend from './CategoryLegend'
import Icon, { IconButton } from './Icon'
import { SLOTS, slotOf, tint } from '../lib/categories'
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
  onMode: (m: ViewMode) => void
  onSelect: (iso: string) => void
  onAdd: (iso: string) => void
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
export default function CalendarMonthView({ mode, anchor, events, selected, flashId, nextId, onMode, onSelect, onAdd, onPrev, onNext, onToday, onOpenEvent }: Props) {
  const days = useMemo(() => windowDays(anchor, mode), [anchor, mode])
  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) m.set(e.event_date, [...(m.get(e.event_date) ?? []), e])
    return m
  }, [events])
  const today = todayIso()
  const isGrid = mode === 'month' || mode === 'bimonth' || mode === 'quarter'
  const rows = Math.ceil(days.length / 7)
  const firstDow = weekdayOf(days[0])
  // כותרות ימי השבוע מתחילות מיום השבוע של התא הראשון, כך שהיום תמיד בעמודה האמצעית
  const heads = Array.from({ length: 7 }, (_, i) => (firstDow + i) % 7)
  const centerCol = 3
  const monthOf = (iso: string) => iso.slice(0, 7)
  const dense = mode === 'quarter' || mode === 'bimonth'

  const cell = (iso: string, idx: number) => {
    const list = byDate.get(iso) ?? []
    const isSel = iso === selected
    const isToday = iso === today
    const dow = weekdayOf(iso)
    const weekend = dow === 5 || dow === 6
    const { m, d } = parseIso(iso)
    const slotsHere = SLOTS.filter((sl) => list.some((e) => e.category === sl.key))
    // צבע היום: צבע הקטגוריה. כמה קטגוריות באותו יום מוצגות כפסים. מתחת: לבן, או אפור בהיר בשישי ושבת
    const base = weekend ? WEEKEND_BG : '#FFFFFF'
    const colors = slotsHere.map((sl) => tint(sl.color))
    const layer = colors.length === 0 ? null : colors.length === 1 ? `linear-gradient(${colors[0]}, ${colors[0]})` : `linear-gradient(90deg, ${colors.map((c, i) => `${c} ${(i * 100) / colors.length}% ${((i + 1) * 100) / colors.length}%`).join(', ')})`
    const background = layer ? `${layer}, ${base}` : isSel ? '#E8ECF4' : base
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
      style.outline = '3px solid #111111'
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
        aria-label={`${formatShort(iso)}${list.length ? `, ${list.length} אירועים` : ''}. לחיצה כפולה להוספת אירוע`}
        title="לחיצה כפולה: הוספת אירוע ליום הזה"
        style={style}
        onClick={() => onSelect(iso)}
        onDoubleClick={() => onAdd(iso)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(iso))}
        className={`group flex min-h-12 cursor-pointer flex-col p-1.5 transition-colors ${big ? 'rounded-lg border sm:p-2.5' : ''}`}
      >
        <div className={`flex gap-1 ${big ? 'items-start justify-between' : 'flex-col items-center sm:flex-row sm:items-start sm:justify-between'}`}>
          <span className={`num text-sm ${big ? 'text-base sm:text-lg' : ''} ${isToday ? 'font-semibold' : iso < today && !isSel ? 'text-mute' : ''}`}>{label}</span>
          <span className="flex items-center gap-0.5">
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
        {isToday && big && <span className="mt-0.5 text-xs font-semibold">היום</span>}

        {mode !== 'quarter' && mode !== 'bimonth' && (
          <div className={`mt-1 min-h-0 flex-col gap-1 overflow-hidden ${big ? 'flex' : 'hidden sm:flex'}`}>
            {(big ? list : list.slice(0, 2)).map((e) => {
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
                  className={`flex items-start gap-1.5 rounded-md px-1.5 py-0.5 text-right text-xs hover:opacity-85 ${big ? 'sm:text-sm' : ''} ${flashId === e.id ? 'flash' : ''}`}
                  title={e.title}
                >
                  {e.event_time && <span className="num shrink-0 opacity-80">{e.event_time.slice(0, 5)}</span>}
                  <span className={big ? 'break-words' : 'truncate'}>{e.title}</span>
                </button>
              )
            })}
            {!big && list.length > 2 && <span className="text-xs text-mute">ועוד {list.length - 2}</span>}
          </div>
        )}
      </div>
    )
  }

  const minRow = mode === 'quarter' ? 44 : mode === 'bimonth' ? 52 : 56

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={`לוח שנה, ${VIEW_LABEL[mode]}`}>
      {/* בורר תצוגה: חמישה כפתורים באותו גודל */}
      <div className="mb-3 grid grid-cols-5 gap-1.5 sm:gap-2" role="group" aria-label="תצוגה">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => onMode(m)}
            className={`btn !px-0.5 text-[13px] whitespace-nowrap sm:!px-3 sm:text-base ${mode === m ? 'btn-primary' : ''}`}
          >
            {VIEW_LABEL[m]}
          </button>
        ))}
      </div>

      {/* הקודם והבא במקום קבוע, באותו רוחב */}
      <div className="mb-3 grid grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-2 sm:grid-cols-[88px_minmax(0,1fr)_88px]">
        <button type="button" className="btn" onClick={onPrev}>הקודם</button>
        <div className="flex flex-col items-center">
          <h2 className="text-center text-sm font-light leading-tight sm:whitespace-nowrap sm:text-2xl">
            <span className="num">{formatRange(days[0], days[days.length - 1])}</span>
          </h2>
          <button type="button" className="text-sm text-navy underline underline-offset-4" onClick={onToday}>חזרה להיום</button>
        </div>
        <button type="button" className="btn" onClick={onNext}>הבא</button>
      </div>

      <div role="grid" className="flex min-h-0 flex-1 flex-col">
        {/* ימי השבוע: גדולים ובולטים, היום האמצעי מסומן, ושישי ושבת באפור */}
        {mode !== 'day' && (
          <div role="row" className={`grid-cols-7 pb-1.5 text-center ${mode === 'week' ? 'hidden sm:grid' : 'grid'}`}>
            {heads.map((dow, i) => (
              <div key={i} role="columnheader" className={`text-lg font-semibold sm:text-xl ${i === centerCol ? 'text-ink' : dow === 5 || dow === 6 ? 'text-mute' : 'text-ink'}`}>
                <span className="sm:hidden">{HE_DAYS_SHORT[dow]}</span>
                <span className="hidden sm:inline">{HE_DAYS_FULL[dow]}</span>
                {i === centerCol && <span className="block h-1 rounded bg-[#111111]" aria-hidden="true" />}
              </div>
            ))}
          </div>
        )}

        {mode === 'day' && (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-1.5 overflow-auto sm:grid-cols-[1fr_1.5fr_1fr] sm:grid-rows-1">{days.map(cell)}</div>
        )}

        {/* שבוע: מסגרת אחת סביב כל השבוע, ומסגרת לכל יום */}
        {mode === 'week' && (
          <div className="min-h-0 flex-1 overflow-auto rounded-lg p-1.5" style={{ border: `2px solid ${WEEK_FRAME}` }}>
            <div className="grid h-full grid-cols-1 gap-1.5 sm:grid-cols-7 sm:grid-rows-1">{days.map(cell)}</div>
          </div>
        )}

        {/* חודש, חודשיים, 3 חודשים: מסגרת לכל שבוע (שורה), וקו עבה בגבול כל חודש */}
        {isGrid && (
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto">
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="grid shrink-0 grid-cols-7 overflow-hidden rounded-lg" style={{ border: `2px solid ${WEEK_FRAME}`, flex: `1 0 ${minRow}px` }}>
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
