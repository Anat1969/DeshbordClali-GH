import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import QuickLinks from '../components/QuickLinks'
import { useApp } from '../lib/ctx'
import { useTasks } from '../hooks/useTasks'
import { dayKey, getInspiration, markSeen, type InspireCard } from '../lib/inspire'
import { addDays, formatLong, formatShort, formatTime, todayIso } from '../lib/dateUtils'

// צבע ואייקון לכל סוג כרטיס
const KIND: Record<InspireCard['kind'], { icon: IconName; ink: string; bar: string }> = {
  power: { icon: 'quote', ink: '#6F2FA3', bar: '#8E44C8' },
  insight: { icon: 'bulb', ink: '#1E52AE', bar: '#2B6CD9' },
  train: { icon: 'target', ink: '#1F7A44', bar: '#2E9E5B' },
  exercise: { icon: 'dumbbell', ink: '#B85F0B', bar: '#F08A24' },
  news: { icon: 'news', ink: '#B92B2B', bar: '#D93B3B' },
  song: { icon: 'music', ink: '#3B3188', bar: '#4B3FA8' },
  distilled: { icon: 'spark', ink: '#8A6D00', bar: '#F2C514' },
  word: { icon: 'star', ink: '#5B6270', bar: '#9AA3B2' },
}

// השראה בשורות מסודרות: משפט העצמה לבד, שלושה כרטיסי קריאה, אימון ואקטואליה, ושיר ומילה
const ROWS: { kinds: InspireCard['kind'][]; grid: string }[] = [
  { kinds: ['power'], grid: '' },
  { kinds: ['insight', 'exercise', 'distilled'], grid: 'sm:grid-cols-2 lg:grid-cols-3' },
  { kinds: ['train', 'news'], grid: 'lg:grid-cols-[3fr_2fr]' },
  { kinds: ['song', 'word'], grid: 'sm:grid-cols-2' },
]

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }).format(new Date()))
  return h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 18 ? 'צהריים טובים' : 'ערב טוב'
}

// דף פתיחה: מה היום, מה מחר (כדי להתכונן), משימות פתוחות ומה בוצע אתמול, והשראה מהאפליקציות
export default function Welcome() {
  const app = useApp()
  const { tasks, loading: tasksLoading } = useTasks()
  const [cards, setCards] = useState<InspireCard[] | null>(null)
  const [failed, setFailed] = useState(false)
  const today = todayIso()
  const tomorrow = addDays(today, 1)
  const yesterday = addDays(today, -1)
  const ev = app.ev.events
  const todays = ev.filter((e) => e.event_date === today)
  const tomorrows = ev.filter((e) => e.event_date === tomorrow)
  const open = tasks.filter((t) => !t.done)
  const doneYesterday = tasks.filter((t) => t.done && t.done_at && dayKey(t.done_at) === yesterday)

  useEffect(() => {
    markSeen()
    getInspiration().then(setCards).catch(() => setFailed(true))
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-mute">
            <Icon name="sun" size={18} />
            {formatLong(today)}
          </p>
          <h1 className="mt-1 text-4xl font-light sm:text-5xl">{greeting()}, <b>ענת</b></h1>
        </div>
        <Link to="/" className="btn btn-primary min-h-12 px-6 text-lg">
          כניסה ליומן
          <Icon name="chevronL" size={20} />
        </Link>
      </header>

      <div className="mt-5"><QuickLinks /></div>

      {/* ארבעה בלוקים בשורה: היום, מחר, פתוחות, בוצעו אתמול */}
      <section className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="סיכום יומי">
        <Block icon="calendar" title="היום ביומן" count={todays.length} loading={app.ev.loading} empty="אין אירועים היום. יום פנוי.">
          {todays.map((e) => <EventLine key={e.id} time={formatTime(e.event_time)} title={e.title} place={e.location} />)}
        </Block>
        <Block icon="clock" title={`מחר: להתכונן`} sub={formatShort(tomorrow)} count={tomorrows.length} loading={app.ev.loading} empty="אין אירועים מחר.">
          {tomorrows.map((e) => <EventLine key={e.id} time={formatTime(e.event_time)} title={e.title} place={e.location} />)}
        </Block>
        <Block icon="check" title="משימות פתוחות" count={open.length} loading={tasksLoading} empty="אין משימות פתוחות.">
          {open.slice(0, 6).map((t) => <li key={t.id} className="break-words font-semibold text-[#111111]">{t.text}</li>)}
          {open.length > 6 && <li className="text-sm text-mute">ועוד {open.length - 6} משימות ביומן</li>}
        </Block>
        <Block icon="check" title="בוצעו אתמול" count={doneYesterday.length} loading={tasksLoading} empty="לא סומנו משימות אתמול.">
          {doneYesterday.map((t) => <li key={t.id} className="break-words text-mute line-through decoration-2">{t.text}</li>)}
        </Block>
      </section>

      <h2 className="mb-4 mt-10 text-2xl font-light">השראה להיום <span className="text-base text-mute">מהאפליקציות שלך</span></h2>

      {failed && <p className="rounded-lg bg-[#FBECEA] p-3 text-bad" role="alert">ההשראה לא נטענה כרגע. אפשר להמשיך ליומן.</p>}
      {!cards && !failed && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-44" />)}
        </div>
      )}

      <div className="grid gap-4">
        {cards && ROWS.map((row, i) => {
          const list = row.kinds.flatMap((k) => cards.filter((c) => c.kind === k))
          return list.length > 0 && (
            <div key={i} className={`grid items-stretch gap-4 ${row.grid}`}>
              {list.map((c) => <Card key={c.id} card={c} big={c.kind === 'power'} />)}
            </div>
          )
        })}
      </div>

      <div className="mt-10 text-center">
        <Link to="/" className="btn btn-primary min-h-12 px-8 text-lg">
          כניסה ליומן
          <Icon name="chevronL" size={20} />
        </Link>
      </div>
    </div>
  )
}

function Block({ icon, title, sub, count, loading, empty, children }: { icon: IconName; title: string; sub?: string; count: number; loading: boolean; empty: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg bg-soft/70 p-4">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Icon name={icon} size={18} />
        <span className="flex-1">{title}</span>
        <span className="num rounded-md bg-white px-2 text-sm">{loading ? '...' : count}</span>
      </h3>
      {sub && <p className="text-sm text-mute">{sub}</p>}
      {loading ? <div className="skeleton mt-3 h-6" /> : count === 0 ? <p className="mt-3 text-mute">{empty}</p> : <ul className="m-0 mt-3 grid list-none gap-2 p-0">{children}</ul>}
    </div>
  )
}

function EventLine({ time, title, place }: { time: string; title: string; place: string | null }) {
  return (
    <li className="flex items-start gap-3">
      <span className="num w-12 shrink-0 font-semibold">{time || '--:--'}</span>
      <span className="min-w-0">
        <span className="block break-words font-semibold text-[#111111]">{title}</span>
        {place && <span className="block break-words text-sm text-mute">{place}</span>}
      </span>
    </li>
  )
}

// אייקון האפליקציה: תמונת השער שלה. אם לא נטענת, האות הראשונה
function AppIcon({ cover, name }: { cover: string | null; name: string }) {
  const [broken, setBroken] = useState(false)
  return cover && !broken ? (
    <img src={cover} alt="" loading="lazy" onError={() => setBroken(true)} className="h-8 w-8 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-soft font-semibold text-navy" aria-hidden="true">{name.slice(0, 1)}</span>
  )
}

function Card({ card, big }: { card: InspireCard; big?: boolean }) {
  const k = KIND[card.kind]
  const appName = card.app?.name ?? card.source
  const appUrl = card.app?.url ?? card.url ?? null
  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-btn ${big ? 'p-6 sm:p-9' : 'p-5'}`} style={{ borderTop: `4px solid ${k.bar}` }}>
      <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: k.ink }}>
        <Icon name={k.icon} size={18} />
        {card.label}
      </p>
      {card.title && <h3 className={`mt-2 break-words font-semibold text-[#111111] ${big ? 'text-xl' : 'text-lg'}`}>{card.title}</h3>}
      <p className={`mt-2 break-words ${big ? 'text-2xl font-light leading-relaxed sm:text-4xl' : 'leading-relaxed'}`}>{card.text}</p>
      {card.kind === 'train' && <Quiz card={card} />}
      {card.meta && <p className="mt-2 break-words text-sm text-mute">{card.meta}</p>}
      {/* תחתית הכרטיס: האפליקציה שממנה בא, עם האייקון שלה */}
      <footer className="mt-auto flex items-center justify-between gap-3 pt-4">
        {appUrl ? (
          <a href={appUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2.5 text-sm text-mute hover:text-ink" title={`פתיחת ${appName}`}>
            <AppIcon cover={card.app?.cover ?? null} name={appName} />
            <span className="min-w-0 break-words">מתוך {appName}</span>
            <Icon name="external" size={12} className="shrink-0" />
          </a>
        ) : (
          <span className="flex min-w-0 items-center gap-2.5 text-sm text-mute">
            <AppIcon cover={card.app?.cover ?? null} name={appName} />
            <span className="min-w-0 break-words">מתוך {appName}</span>
          </span>
        )}
        {card.kind === 'song' && card.url && (
          <a href={card.url} target="_blank" rel="noopener noreferrer" className="btn !min-h-9 shrink-0 gap-1.5 !px-3 text-sm text-navy">
            פתיחה
            <Icon name="external" size={14} />
          </a>
        )}
      </footer>
    </article>
  )
}

// אימון: בוחרים תשובה, ומיד רואים נכון או לא נכון עם הסבר
function Quiz({ card }: { card: InspireCard }) {
  const [pick, setPick] = useState<number | null>(null)
  const done = pick !== null
  return (
    <div className="mt-3">
      {card.hint && <p className="mb-2 text-sm text-mute">{card.hint}</p>}
      <div className="grid gap-2" role="group" aria-label="תשובות">
        {card.options?.map((o, i) => {
          const right = i === card.correct
          const chosen = pick === i
          return (
            <button
              key={i}
              type="button"
              disabled={done}
              onClick={() => setPick(i)}
              className={`btn !h-auto !justify-start !py-2.5 text-right ${done && right ? '!bg-[#DDF1E5] font-semibold' : ''} ${done && chosen && !right ? '!bg-[#FBECEA]' : ''}`}
            >
              {o}
              {done && right && <span className="ms-auto text-good">נכון</span>}
              {done && chosen && !right && <span className="ms-auto text-bad">לא נכון</span>}
            </button>
          )
        })}
      </div>
      {done && card.explanation && <p className="mt-2 break-words text-sm">{card.explanation}</p>}
    </div>
  )
}
