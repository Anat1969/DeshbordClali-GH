import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import Clock from '../components/Clock'
import MiniCalendar from '../components/MiniCalendar'
import HomeTasks from '../components/HomeTasks'
import Sentences from '../components/Sentences'
import CalendarMonthView from '../components/CalendarMonthView'
import EventModal from '../components/EventModal'
import TaskList from '../components/TaskList'
import { Terrain } from '../components/MorningBrief'
import Welcome from './Welcome'
import Work from './Work'
import { useApp } from '../lib/ctx'
import { useTasks } from '../hooks/useTasks'
import { useHomeView } from '../lib/view'
import { buildBrief } from '../lib/brief'
import { getInspiration, type InspireCard } from '../lib/inspire'
import { milestoneMap } from '../lib/projects'
import { slotOf } from '../lib/categories'
import { VIEW_STEP, addDays, daysUntil, formatLong, formatShort, formatTime, relativeDays, todayIso, type ViewMode } from '../lib/dateUtils'
import type { CalEvent } from '../types'

const HAND = { fontFamily: '"Gveret Levin", Heebo, cursive', fontWeight: 400 } as const

// דף הבית לפי התצוגה שנבחרה בכפתור "תצוגה". ברירת המחדל היא התדרוך הרגיל
export default function HomeSwitch() {
  const view = useHomeView()
  return view === 'magazine' ? <Magazine /> : view === 'desk' ? <Desk /> : view === 'timeline' ? <Timeline /> : <Welcome />
}

// ---- מגזין בוקר: כפולת עמודים. כותרת היום, ציור היום על כל הרוחב, ושלושה טורים ----
function Magazine() {
  const app = useApp()
  const { tasks, patch } = useTasks()
  const today = todayIso()
  const [cards, setCards] = useState<InspireCard[]>([])
  useEffect(() => { getInspiration().then(setCards).catch(() => undefined) }, [])
  const brief = useMemo(() => buildBrief({ events: app.ev.events, tasks, projects: app.projects.projects, today, name: 'ענת' }), [app.ev.events, tasks, app.projects.projects, today])
  const marked = useMemo(() => new Set(milestoneMap(app.projects.projects).keys()), [app.projects.projects])
  const power = cards.find((c) => c.kind === 'power') ?? cards.find((c) => c.kind === 'distilled')

  if (app.ev.loading) return <div className="p-8"><div className="skeleton h-80" aria-busy="true" /></div>
  return (
    <div className="w-full bg-white">
      <section className="mx-auto w-full max-w-[1760px] px-4 pb-6 pt-6 sm:px-10" aria-label="מגזין בוקר">
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
          <p className="m-0 text-lg font-semibold">{formatLong(today)}</p>
          <p className="m-0 text-sm text-mute">מהדורת הבוקר של יומן חכם</p>
        </div>
        <div className="mt-5 grid items-start gap-x-10 gap-y-6 lg:grid-cols-[1.62fr_1fr]">
          <div className="min-w-0">
            <h1 className="rise m-0 break-words leading-[1.15]" style={{ ...HAND, fontSize: 'clamp(40px, 4.4vw, 80px)' }}>{brief.headline}</h1>
            <div className="mt-3"><Terrain brief={brief} /></div>
            <p className="m-0 text-sm text-mute">צורת היום: הקו הוא העומס לאורך השעות, מהבוקר מימין. כל נקודה היא אירוע.</p>
          </div>
          <div className="rise flex flex-wrap items-center justify-center gap-6 lg:justify-end" style={{ '--d': '200ms' } as React.CSSProperties}>
            <Clock size={200} />
            <MiniCalendar events={app.ev.events} marked={marked} />
          </div>
        </div>

        <div className="mt-6 grid gap-x-10 gap-y-8 lg:grid-cols-3">
          <Column title="היום, לפי שעות" n={1}>
            <div className="grid gap-4">
              {brief.acts.map((a) => (
                <div key={a.range}>
                  <p className="num m-0 text-xl font-semibold"><span className="marker">{a.range}</span></p>
                  <Sentences text={a.text} className="mt-1 text-[17px] leading-relaxed" />
                </div>
              ))}
            </div>
            <Link to="/calendar" className="btn btn-primary mt-5">ליומן המלא<Icon name="chevronL" size={18} /></Link>
          </Column>
          <Column title="דורש תשומת לב" n={2}>
            {brief.needs.length === 0 ? <p className="m-0 text-lg text-mute">אין מה שדורש אותך הבוקר.</p> : (
              <ol className="m-0 grid list-none gap-3.5 p-0">
                {brief.needs.slice(0, 6).map((it, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="num w-5 shrink-0 pt-0.5 text-mute">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="m-0 break-words text-lg font-semibold text-[#111111]">{it.to ? <Link to={it.to} className="hover:underline">{it.title}</Link> : it.title}</p>
                      <p className="m-0 break-words text-[15px] leading-relaxed text-mute">{it.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Column>
          <Column title="מילה לדרך" n={3}>
            {power ? (
              <>
                <p className="m-0 break-words text-3xl leading-snug" style={HAND}>{power.text}</p>
                <p className="m-0 mt-2 text-sm text-mute">מתוך {power.app?.name ?? power.source}</p>
              </>
            ) : <p className="m-0 text-mute">ההשראה של היום בדרך.</p>}
            {brief.resolved.length > 0 && (
              <div className="mt-6">
                <p className="m-0 mb-1.5 font-semibold text-good">כבר סגור</p>
                <ul className="m-0 grid list-none gap-1 p-0">
                  {brief.resolved.slice(0, 4).map((it, i) => <li key={i} className="flex items-start gap-2 text-[15px]"><Icon name="check" size={16} className="mt-1 shrink-0 text-good" /><span className="min-w-0 break-words">{it.title}</span></li>)}
                </ul>
              </div>
            )}
          </Column>
        </div>
      </section>
      <HomeTasks tasks={tasks} onPatch={patch} />
    </div>
  )
}

function Column({ title, n, children }: { title: string; n: number; children: React.ReactNode }) {
  return (
    <section className="rise min-w-0 border-t border-line pt-4" style={{ '--d': `${400 + n * 140}ms` } as React.CSSProperties} aria-label={title}>
      <h2 className="m-0 mb-3 flex items-baseline gap-2 text-2xl font-light"><span className="num text-base text-mute">{n}</span>{title}</h2>
      {children}
    </section>
  )
}

// ---- שולחן עבודה: משימות, יומן ושיחה במסך אחד, בלי מעברים ----
function Desk() {
  const app = useApp()
  const { events, loading, flashId } = app.ev
  const [anchor, setAnchor] = useState(todayIso())
  const [selected, setSelected] = useState(todayIso())
  const [mode, setMode] = useState<ViewMode>('month')
  const [open, setOpen] = useState<CalEvent | null>(null)
  const milestones = useMemo(() => milestoneMap(app.projects.projects), [app.projects.projects])
  const next = useMemo(() => events.find((e) => daysUntil(e.event_date) >= 0), [events])
  const openLive = open ? events.find((e) => e.id === open.id) ?? null : null
  const steps = app.projects.projects.filter((p) => p.status !== 'done' && p.next_step).slice(0, 5)

  return (
    <div className="grid w-full flex-1 gap-4 px-3 py-3 sm:px-5 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)_minmax(0,1.3fr)] lg:grid-rows-[minmax(0,1fr)]">
      <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto" aria-label="משימות ופרויקטים">
        <TaskList />
        {steps.length > 0 && (
          <section aria-label="הצעד הבא בפרויקטים">
            <h2 className="m-0 mb-2 flex items-center gap-2 text-xl font-light"><Icon name="chart" size={20} />הצעד הבא בפרויקטים</h2>
            <ul className="m-0 grid list-none gap-2 p-0">
              {steps.map((p) => (
                <li key={p.id}><Link to="/projects" className="block rounded-lg bg-soft/70 p-2.5 hover:bg-soft"><span className="block text-sm text-mute">{p.name}</span><b className="break-words">{p.next_step}</b></Link></li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      <section className="flex min-h-[520px] flex-col gap-2 lg:min-h-0" aria-label="היומן">
        <p className="m-0 text-lg">
          {next ? <>האירוע הבא: <mark className="marker font-semibold">{next.title}</mark>, {relativeDays(next.event_date)}{next.event_time ? ` בשעה ${formatTime(next.event_time)}` : ''}</> : 'אין אירועים קרובים.'}
        </p>
        <div className="flex min-h-0 flex-1 flex-col">
          {loading ? <div className="skeleton flex-1" /> : (
            <CalendarMonthView mode={mode} anchor={anchor} events={events} selected={selected} flashId={flashId} nextId={next?.id ?? null} milestones={milestones}
              onAdd={(iso, time) => (setSelected(iso), app.newManual(iso, time))} onMode={setMode} onSelect={setSelected}
              onPrev={() => setAnchor((a) => addDays(a, -VIEW_STEP[mode]))} onNext={() => setAnchor((a) => addDays(a, VIEW_STEP[mode]))}
              onToday={() => { setAnchor(todayIso()); setSelected(todayIso()) }} onOpenEvent={setOpen} />
          )}
        </div>
      </section>

      <aside className="flex min-h-[560px] flex-col rounded-lg lg:min-h-0" aria-label="שיחה עם הבוט"><Work /></aside>
      {openLive && <EventModal event={openLive} onClose={() => setOpen(null)} />}
    </div>
  )
}

// ---- ציר זמן: קו אחד מהיום קדימה, עם הימים הפנויים ביניהם ----
type Kind = 'event' | 'milestone' | 'due'
const KIND: Record<Kind, { name: string; color: string; icon: IconName }> = {
  event: { name: 'אירוע (בצבע הקטגוריה)', color: '#1A2B4A', icon: 'calendar' },
  milestone: { name: 'אבן דרך בפרויקט', color: '#C6613F', icon: 'diamond' },
  due: { name: 'מועד יעד של פרויקט', color: '#B3392F', icon: 'flag' },
}
interface Row { date: string; time: string; kind: Kind; title: string; sub: string; color: string; event?: CalEvent }

function Timeline() {
  const app = useApp()
  const { tasks, patch } = useTasks()
  const today = todayIso()
  const [open, setOpen] = useState<CalEvent | null>(null)
  const openLive = open ? app.ev.events.find((e) => e.id === open.id) ?? null : null

  const rows = useMemo(() => {
    const out: Row[] = []
    for (const e of app.ev.events) if (e.event_date >= today) out.push({ date: e.event_date, time: formatTime(e.event_time), kind: 'event', title: e.title, sub: [e.location, e.people.length ? `עם ${e.people.join(', ')}` : ''].filter(Boolean).join(' · '), color: slotOf(e.category)?.color ?? KIND.event.color, event: e })
    for (const p of app.projects.projects.filter((x) => x.status !== 'done')) {
      for (const m of p.milestones.filter((x) => !x.done)) out.push({ date: m.date < today ? today : m.date, time: '', kind: 'milestone', title: m.name, sub: `${p.name}${m.date < today ? ` · באיחור של ${-daysUntil(m.date, today)} ימים` : ''}`, color: KIND.milestone.color })
      if (p.due_date) out.push({ date: p.due_date < today ? today : p.due_date, time: '', kind: 'due', title: p.name, sub: p.due_date < today ? `באיחור של ${-daysUntil(p.due_date, today)} ימים${p.next_step ? ` · הצעד הבא: ${p.next_step}` : ''}` : p.next_step ? `הצעד הבא: ${p.next_step}` : 'מועד היעד', color: KIND.due.color })
    }
    return out.sort((a, b) => (a.date + (a.time || '99') < b.date + (b.time || '99') ? -1 : 1))
  }, [app.ev.events, app.projects.projects, today])

  const days = useMemo(() => {
    const m = new Map<string, Row[]>()
    if (!rows.some((r) => r.date === today)) m.set(today, [])
    for (const r of rows) m.set(r.date, [...(m.get(r.date) ?? []), r])
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  }, [rows, today])
  const openTasks = tasks.filter((t) => !t.done)
  const next = rows[0]

  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section aria-label="ציר זמן">
        <h1 className="m-0 text-2xl font-light sm:text-3xl">
          {next ? <>הדבר הבא: <mark className="marker font-semibold">{next.title}</mark>, {relativeDays(next.date)}{next.time ? ` ב-${next.time}` : ''}</> : 'הציר פנוי. אין אירועים או מועדים קדימה.'}
        </h1>
        <p className="m-0 mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-mute" aria-label="מקרא">
          {(Object.keys(KIND) as Kind[]).map((k) => <span key={k} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: KIND[k].color }} />{KIND[k].name}</span>)}
          <span>קו מקווקו: ימים פנויים</span>
        </p>

        <ol className="m-0 mt-6 list-none p-0">
          {days.map(([date, list], i) => {
            const gap = i > 0 ? daysUntil(date, days[i - 1][0]) - 1 : 0
            return (
              <li key={date}>
                {gap > 0 && <p className="m-0 border-s-2 border-dashed border-[#C9CED8] py-3 ps-6 text-sm text-mute"><span className="num">{gap}</span> {gap === 1 ? 'יום פנוי' : 'ימים פנויים'}</p>}
                <div className="relative border-s-2 border-ink pb-5 ps-6">
                  <span className={`absolute -start-[9px] top-1 h-4 w-4 rounded-full ${date === today ? 'bg-[#FFE066] shadow-[0_0_0_2px_#2E2E2B]' : 'bg-ink'}`} aria-hidden="true" />
                  <h2 className="m-0 text-xl font-semibold">{date === today ? <span className="marker">היום</span> : relativeDays(date)} <span className="text-base font-normal text-mute">{formatShort(date)}</span></h2>
                  {list.length === 0 && <p className="m-0 mt-1 text-mute">אין אירועים היום. <button type="button" className="text-navy underline underline-offset-4" onClick={() => app.newManual(date)}>הוספת אירוע</button></p>}
                  <ul className="m-0 mt-2 grid list-none gap-2 p-0">
                    {list.map((r, k) => {
                      const body = (
                        <>
                          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white" style={{ background: r.color }}><Icon name={KIND[r.kind].icon} size={15} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-lg font-semibold text-[#111111]">{r.time && <span className="num me-2 font-normal">{r.time}</span>}{r.title}</span>
                            {r.sub && <span className="block break-words text-[15px] text-mute">{r.sub}</span>}
                          </span>
                        </>
                      )
                      return (
                        <li key={k}>
                          {r.event
                            ? <button type="button" onClick={() => setOpen(r.event!)} className="flex w-full items-start gap-3 rounded-lg bg-white p-2.5 text-right shadow-btn hover:bg-soft">{body}</button>
                            : <Link to="/projects" className="flex items-start gap-3 rounded-lg bg-white p-2.5 shadow-btn hover:bg-soft">{body}</Link>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <aside className="lg:sticky lg:top-4 lg:self-start" aria-label="משימות בלי תאריך">
        <h2 className="m-0 text-xl font-light">בלי תאריך: <b className="num">{openTasks.length}</b> משימות פתוחות</h2>
        <p className="m-0 mb-3 mt-1 text-sm text-mute">משימות לא יושבות על הציר, כי אין להן מועד. סימון "בוצע" כאן.</p>
        {openTasks.length === 0 ? <p className="m-0 text-mute">אין משימות פתוחות.</p> : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {openTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-lg bg-soft/70 p-2.5">
                <span className="min-w-0 flex-1 break-words font-semibold">{t.text}</span>
                <button type="button" className="btn btn-primary !min-h-9 shrink-0 !px-3 text-sm" onClick={() => patch(t.id, { done: true }).catch(() => app.toast('הסימון נכשל'))}><Icon name="check" size={16} />בוצע</button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/tasks" className="mt-3 inline-block text-navy underline underline-offset-4">לכל המשימות</Link>
      </aside>
      {openLive && <EventModal event={openLive} onClose={() => setOpen(null)} />}
    </div>
  )
}
