import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import MorningBrief from '../components/MorningBrief'
import QuickLinks from '../components/QuickLinks'
import { useApp } from '../lib/ctx'
import { useTasks } from '../hooks/useTasks'
import { buildBrief } from '../lib/brief'
import { getInspiration, markSeen, type InspireCard } from '../lib/inspire'
import { formatLong, formatShort, todayIso } from '../lib/dateUtils'

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

// דף פתיחה: מה היום, מה מחר (כדי להתכונן), משימות פתוחות ומה בוצע אתמול, והשראה מהאפליקציות
export default function Welcome() {
  const app = useApp()
  const { tasks } = useTasks()
  const projects = app.projects.projects
  const [cards, setCards] = useState<InspireCard[] | null>(null)
  const [failed, setFailed] = useState(false)
  const today = todayIso()
  const ready = !app.ev.loading

  useEffect(() => {
    markSeen()
    getInspiration().then(setCards).catch(() => setFailed(true))
  }, [])

  // תדרוך הבוקר מחושב מהאירועים, המשימות והפרויקטים
  const brief = useMemo(() => buildBrief({ events: app.ev.events, tasks, projects, today, name: 'ענת' }), [app.ev.events, tasks, projects, today])
  const dateLine = `${formatShort(today).split(',')[0]} · ${formatLong(today).replace(/^[^,]+, /, '')}`

  return (
    <div className="w-full">
      {ready ? (
        <MorningBrief brief={brief} dateLine={dateLine}>
          <Link to="/" className="btn btn-primary shrink-0">
            כניסה ליומן
            <Icon name="chevronL" size={18} />
          </Link>
        </MorningBrief>
      ) : (
        <div className="mx-auto max-w-[860px] px-4 py-10"><div className="skeleton h-64" aria-busy="true" /></div>
      )}

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <QuickLinks />
          <Link to="/projects" className="btn gap-2 text-navy"><Icon name="chart" size={18} />מעקב פרויקטים</Link>
        </div>

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
    </div>
  )
}

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
