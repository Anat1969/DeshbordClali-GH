import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useApp } from '../lib/ctx'
import { dayKey } from '../lib/inspire'
import type { Task } from '../types'

// משימות שנשארו, בדף הבית: סימון בוצע או לא בוצע בלחיצה. משימה שסומנה נשארת במקומה, כדי שאפשר יהיה לבטל
export default function HomeTasks({ tasks, onPatch }: { tasks: Task[]; onPatch: (id: string, p: { done: boolean }) => Promise<void> }) {
  const app = useApp()
  const today = dayKey()
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const doneToday = tasks.filter((t) => t.done && t.done_at && dayKey(t.done_at) === today)
  const list = [...open, ...doneToday]

  const toggle = (t: Task) => onPatch(t.id, { done: !t.done }).catch(() => app.toast('הסימון נכשל, השינוי בוטל'))

  return (
    <section className="w-full bg-white px-4 py-8 sm:px-8" aria-label="משימות שנשארו">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="hand m-0 text-4xl"><span className="marker-lg">משימות שנשארו</span></h2>
          <span className="text-lg text-mute"><span className="num font-semibold">{open.length}</span> פתוחות</span>
        </div>
        {list.length === 0 ? (
          <p className="m-0 text-lg text-mute">אין משימות פתוחות.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {list.map((t, i) => (
              <li key={t.id} className="rise flex items-center gap-3 rounded-lg bg-soft/70 p-3" style={{ '--d': `${i * 70}ms` } as React.CSSProperties}>
                <span className={`min-w-0 flex-1 break-words text-xl ${t.done ? 'text-mute line-through' : 'font-semibold'}`}>{t.text}</span>
                <button type="button" className={`btn shrink-0 ${t.done ? '' : 'btn-primary'}`} aria-pressed={t.done} onClick={() => toggle(t)}>
                  <Icon name="check" size={18} />
                  {t.done ? 'לא בוצע' : 'בוצע'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/tasks" className="mt-4 inline-block text-navy underline underline-offset-4">לכל המשימות, הערות ומסמכים</Link>
      </div>
    </section>
  )
}
