import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import { useApp } from '../lib/ctx'
import { getInspiration, markSeen, type InspireCard } from '../lib/inspire'
import { formatLong, formatTime, todayIso } from '../lib/dateUtils'

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

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }).format(new Date()))
  return h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 18 ? 'צהריים טובים' : 'ערב טוב'
}

// דף פתיחה: השראה ליום מהאפליקציות השונות, ומה ביומן היום
export default function Welcome() {
  const app = useApp()
  const [cards, setCards] = useState<InspireCard[] | null>(null)
  const [failed, setFailed] = useState(false)
  const today = todayIso()
  const todays = app.ev.events.filter((e) => e.event_date === today)

  useEffect(() => {
    markSeen()
    getInspiration().then(setCards).catch(() => setFailed(true))
  }, [])

  const hero = cards?.find((c) => c.kind === 'power')
  const rest = cards?.filter((c) => c !== hero) ?? []

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

      {/* מה ביומן היום */}
      <section className="mt-6 rounded-lg bg-soft/70 p-4" aria-label="היום ביומן">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-light"><Icon name="calendar" size={18} />היום ביומן</h2>
        {app.ev.loading ? (
          <div className="skeleton h-6 w-1/2" />
        ) : todays.length === 0 ? (
          <p className="text-mute">אין אירועים היום. יום פנוי.</p>
        ) : (
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {todays.map((e) => (
              <li key={e.id} className="flex items-start gap-3 break-words">
                <span className="num w-12 shrink-0 font-semibold">{formatTime(e.event_time) || '--:--'}</span>
                <span className="min-w-0 font-semibold text-[#111111]">{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="mb-4 mt-9 text-2xl font-light">השראה להיום <span className="text-base text-mute">מהאפליקציות שלך</span></h2>

      {failed && <p className="rounded-lg bg-[#FBECEA] p-3 text-bad" role="alert">ההשראה לא נטענה כרגע. אפשר להמשיך ליומן.</p>}
      {!cards && !failed && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-44" />)}
        </div>
      )}

      {hero && <Card card={hero} big />}
      {rest.length > 0 && (
        <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((c) => <Card key={c.id} card={c} />)}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/" className="btn btn-primary min-h-12 px-8 text-lg">
          כניסה ליומן
          <Icon name="chevronL" size={20} />
        </Link>
      </div>
    </div>
  )
}

function Card({ card, big }: { card: InspireCard; big?: boolean }) {
  const k = KIND[card.kind]
  return (
    <article className={`mt-0 overflow-hidden rounded-lg bg-white shadow-btn ${big ? 'p-6 sm:p-9' : 'p-5'}`} style={{ borderTop: `4px solid ${k.bar}` }}>
      <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: k.ink }}>
        <Icon name={k.icon} size={18} />
        {card.label}
      </p>
      {card.title && <h3 className={`mt-2 break-words font-semibold text-[#111111] ${big ? 'text-xl' : 'text-lg'}`}>{card.title}</h3>}
      <p className={`mt-2 break-words ${big ? 'text-2xl font-light leading-relaxed sm:text-4xl' : 'leading-relaxed'}`}>{card.text}</p>
      {card.kind === 'train' && <Quiz card={card} />}
      {card.meta && <p className="mt-2 break-words text-sm text-mute">{card.meta}</p>}
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-mute">
        <span>מתוך {card.source}</span>
        {card.url && (
          <a href={card.url} target="_blank" rel="noopener noreferrer" className="btn !min-h-9 gap-1.5 !px-3 text-sm text-navy">
            פתיחה
            <Icon name="external" size={14} />
          </a>
        )}
      </div>
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
