import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { useApp } from '../lib/ctx'
import { addTaskLink, createTask } from '../lib/tasks'
import { continuePrompt, listReports, setHandled, STATUS_TEXT, type AppRow, type AppStatus, type Report } from '../lib/reports'

// צבע עם משמעות: ירוק תקין, כתום ממתין למיזוג, אדום פריסה חסרה או נכשלה
const TONE: Record<AppStatus, string> = { ok: '#2E7D5B', unmerged: '#B85F0B', not_deployed: '#B3392F', failed: '#B3392F' }
const URGENCY: Record<AppStatus, number> = { failed: 0, not_deployed: 1, unmerged: 2, ok: 3 }
const fmt = (iso: string) => iso.split('-').reverse().join('.')
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const dayName = (iso: string) => DAYS[new Date(iso + 'T12:00:00').getDay()]
const CLAUDE_CODE = 'https://claude.ai/code'

// שדרוג אפליקציות: הדוח הלילי, כרשימת פעולות. כל מה שחסר מקבל כפתורי המשך: שיחה חדשה, העתקה, משימה, וסימון טופל
export default function Upgrades() {
  const app = useApp()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState(false)
  const [pick, setPick] = useState(0)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    listReports().then(setReports).catch(() => setError(true))
  }, [])

  const r = reports?.[pick]
  const handled = useMemo(() => new Set(r?.handled ?? []), [r])
  // מה דורש טיפול: כל אפליקציה שיש לה "לטיפול", הדחופות קודם. מה שסומן כטופל יורד לסוף
  const open = useMemo(() => (r ? r.apps.filter((a) => a.todo).sort((a, b) => Number(handled.has(a.repo)) - Number(handled.has(b.repo)) || URGENCY[a.status] - URGENCY[b.status]) : []), [r, handled])
  const left = open.filter((a) => !handled.has(a.repo)).length
  const leftOf = (x: Report) => x.apps.filter((a) => a.todo && !(x.handled ?? []).includes(a.repo)).length

  const copy = async (a: AppRow) => {
    try {
      await navigator.clipboard.writeText(continuePrompt(a, r!.report_date))
      setCopied(a.repo)
      return true
    } catch {
      app.toast('ההעתקה נחסמה בדפדפן. אפשר לסמן את הטקסט ולהעתיק ידנית')
      return false
    }
  }
  // שיחה שמחוברת לריפו של האפליקציה נוצרת מראש ונשמרת בדוח. הכפתור פותח אותה, וההנחיה מועתקת להדבקה.
  // בלי שיחה מוכנה: נפתח Claude Code, ושם בוחרים את הריפו ידנית
  const start = async (a: AppRow) => {
    const ok = await copy(a)
    const url = r?.sessions[a.repo]
    window.open(url ?? CLAUDE_CODE, '_blank', 'noopener')
    if (ok) app.toast(url ? 'ההנחיה הועתקה. הדביקי אותה בשיחה שנפתחה' : `ההנחיה הועתקה. בחרי את ${a.repo.split('/')[1]} והדביקי`)
  }
  const toTask = async (a: AppRow) => {
    try {
      const t = await createTask(`${a.name}: ${a.todo}`)
      await addTaskLink(t.id, 'הריפו ב-GitHub', `https://github.com/${a.repo}`).catch(() => undefined)
      setSent((s) => new Set(s).add(a.repo))
      app.toast('נוספה למשימות')
    } catch {
      app.toast('ההוספה נכשלה')
    }
  }
  const toggle = async (a: AppRow) => {
    if (!r) return
    const on = !handled.has(a.repo)
    const apply = (list: string[]) => setReports((l) => l && l.map((x) => (x.report_date === r.report_date ? { ...x, handled: list } : x)))
    const prev = r.handled
    apply(on ? [...prev, a.repo] : prev.filter((x) => x !== a.repo))
    try { apply(await setHandled(r.report_date, a.repo, on)) } catch { apply(prev); app.toast('הסימון נכשל, השינוי בוטל') }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="m-0 flex items-center gap-3 text-3xl font-light"><Icon name="target" size={28} />שדרוג <b>אפליקציות</b></h1>
      <p className="mb-5 mt-1 text-mute">
        בכל לילה ב-<span className="num">04:00</span> נבדק שכל שינוי באפליקציות שלך מוזג ל-main ונפרס.
        <br />
        מה שחסר מופיע כאן כפעולה: ממשיכים בשיחה חדשה, הופכים למשימה, או מסמנים שטופל.
      </p>

      {error && <p className="rounded-lg bg-[#FBECEA] p-4 text-bad">הדוחות לא נטענו. אפשר לרענן את הדף.</p>}
      {!reports && !error && <div className="skeleton h-40" />}
      {reports && reports.length === 0 && <p className="rounded-lg bg-soft p-5">עוד אין דוח. הראשון ייכתב הלילה ב-04:00, ואז יופיעו כאן האפליקציות וכפתורי ההמשך.</p>}

      {r && (
        <>
          {/* בחירת יום: הדוח האחרון ראשון. נקודה אדומה: נשאר טיפול */}
          {reports!.length > 1 && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="בחירת יום">
              {reports!.slice(0, 14).map((x, i) => (
                <button key={x.report_date} type="button" onClick={() => setPick(i)} aria-pressed={i === pick}
                  className={`btn !min-h-9 shrink-0 text-sm ${i === pick ? '!bg-navy !text-white' : ''}`}>
                  <span className="num">{fmt(x.report_date).slice(0, 5)}</span>
                  {leftOf(x) > 0 && <span className="h-2 w-2 rounded-full bg-bad" aria-label="נשאר טיפול" />}
                </button>
              ))}
            </div>
          )}

          {/* מוקד: שורת התובנה של היום, ושלושה מספרים */}
          <section className="mb-6 grid items-end gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <div className="text-sm text-mute">יום {dayName(r.report_date)}, <span className="num">{fmt(r.report_date)}</span></div>
              <p className="m-0 mt-1 text-2xl font-light leading-snug sm:text-4xl"><span className="marker">{r.headline}</span></p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat n={r.checked} label="נבדקו" color="#2E2E2B" />
              <Stat n={r.ok} label="מוזגו ונפרסו" color="#2E7D5B" />
              <Stat n={left} label="נשארו לטיפול" color={left ? '#B3392F' : '#2E7D5B'} />
            </div>
          </section>

          {/* מה צריך לעשות: כרטיס לכל אפליקציה, עם כפתורי המשך */}
          {open.length > 0 && (
            <section className="mb-8" aria-label="מה צריך לעשות">
              <h2 className="m-0 mb-1 text-xl font-semibold">מה צריך לעשות <span className="text-base font-normal text-mute">{left ? `· ${left} פתוחות, הדחופות קודם` : '· הכול טופל'}</span></h2>
              <p className="m-0 mb-3 text-sm text-mute">"המשך בשיחה" פותח שיחת Claude שמחוברת לריפו של אותה אפליקציה, ומעתיק הנחיה מוכנה. נשאר להדביק ולשלוח.</p>
              <ol className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2 2xl:grid-cols-3">
                {open.map((a, i) => {
                  const done = handled.has(a.repo)
                  return (
                    <li key={a.repo} className={`flex flex-col rounded-lg bg-white p-4 shadow-btn ${done ? 'opacity-60' : ''}`} style={{ borderTop: `4px solid ${done ? '#2E7D5B' : TONE[a.status]}` }}>
                      <div className="flex items-baseline gap-2">
                        <span className="num text-lg font-light text-mute">{i + 1}.</span>
                        <h3 className={`m-0 min-w-0 flex-1 break-words text-xl font-semibold text-[#111111] ${done ? 'line-through' : ''}`}>{a.name}</h3>
                        <span className="shrink-0 text-sm font-semibold" style={{ color: done ? '#2E7D5B' : TONE[a.status] }}>{done ? 'טופל' : STATUS_TEXT[a.status]}</span>
                      </div>
                      <p className="m-0 mt-2 break-words text-[17px] leading-relaxed"><b className="text-bad">חסר:</b> {a.todo}</p>
                      {a.branches && a.branches.length > 0 && (
                        <p className="m-0 mt-1 text-sm text-mute">ענפים פתוחים: {a.branches.map((b) => <span key={b.name} className="num ms-1" dir="ltr">{b.name} ({b.commits})</span>)}</p>
                      )}
                      <div className="mt-auto grid grid-cols-2 gap-2 pt-4 sm:grid-cols-4">
                        <button type="button" className="btn btn-primary col-span-2 !h-auto !min-h-11 !justify-start gap-2 !px-3 !py-1.5 text-right" disabled={done} onClick={() => start(a)}>
                          <Icon name="spark" size={18} className="shrink-0" />
                          <span className="min-w-0">
                            <span className="block leading-tight">{r.sessions[a.repo] ? 'המשך בשיחה של האפליקציה' : 'העתקת הנחיה ופתיחת Claude'}</span>
                            <span className="num block break-all text-xs font-normal leading-tight opacity-80" dir="ltr" style={{ textAlign: 'right' }}>{a.repo}</span>
                          </span>
                          <Icon name="external" size={14} className="ms-auto shrink-0" />
                        </button>
                        <button type="button" className="btn !min-h-11 gap-1.5 !px-2 text-[15px]" disabled={sent.has(a.repo)} onClick={() => toTask(a)}>
                          <Icon name={sent.has(a.repo) ? 'check' : 'plus'} size={16} />{sent.has(a.repo) ? 'במשימות' : 'למשימות'}
                        </button>
                        <button type="button" className="btn !min-h-11 gap-1.5 !px-2 text-[15px]" aria-pressed={done} onClick={() => toggle(a)}>
                          <Icon name="check" size={16} />{done ? 'ביטול' : 'טופל'}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <button type="button" className="flex items-center gap-1 text-navy underline-offset-2 hover:underline" onClick={() => copy(a).then((ok) => ok && app.toast('ההנחיה הועתקה'))}>
                          <Icon name={copied === a.repo ? 'check' : 'copy'} size={14} />{copied === a.repo ? 'ההנחיה הועתקה' : 'העתקת ההנחיה בלבד'}
                        </button>
                        {a.live_url && <a href={a.live_url} target="_blank" rel="noreferrer" className="text-navy underline-offset-2 hover:underline">לאתר החי</a>}
                        <a href={`https://github.com/${a.repo}`} target="_blank" rel="noreferrer" className="text-mute underline-offset-2 hover:underline">GitHub</a>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}

          {/* מה נעשה: אפליקציה בשורה */}
          <section>
            <h2 className="m-0 mb-3 text-xl font-semibold">מה נעשה <span className="text-base font-normal text-mute">· {r.apps.length} אפליקציות</span></h2>
            <ul className="m-0 list-none divide-y divide-line p-0">
              {r.apps.map((a) => (
                <li key={a.repo} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[1.1fr_2fr]">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TONE[a.status] }} aria-hidden="true" />
                    <div>
                      <div className="font-semibold">{a.name}</div>
                      <div className="text-sm" style={{ color: TONE[a.status] }}>{STATUS_TEXT[a.status]}</div>
                      <div className="mt-1 flex gap-3 text-sm">
                        {a.live_url && <a href={a.live_url} target="_blank" rel="noreferrer" className="text-navy underline-offset-2 hover:underline">לאתר החי</a>}
                        <a href={`https://github.com/${a.repo}`} target="_blank" rel="noreferrer" className="text-mute underline-offset-2 hover:underline">GitHub</a>
                      </div>
                    </div>
                  </div>
                  <div className="text-[15px] leading-relaxed">
                    <div>{a.done}</div>
                    {!a.todo && (
                      <button type="button" className="mt-1 flex items-center gap-1 text-sm text-navy underline-offset-2 hover:underline" onClick={() => start(a)}>
                        <Icon name="spark" size={14} />{r.sessions[a.repo] ? 'שיחה על האפליקציה הזו' : 'העתקת הנחיה ופתיחת Claude'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* מקרא */}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-mute" aria-label="מקרא">
            {(Object.keys(STATUS_TEXT) as AppStatus[]).filter((k) => k !== 'failed').map((k) => (
              <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[k] }} />{STATUS_TEXT[k]}</span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="rounded-lg bg-soft p-3 sm:p-4">
      <div className="num text-3xl font-light sm:text-4xl" style={{ color }}>{n}</div>
      <div className="text-sm text-mute">{label}</div>
    </div>
  )
}
