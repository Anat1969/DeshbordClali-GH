import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { listReports, STATUS_TEXT, type AppStatus, type Report } from '../lib/reports'

// צבע עם משמעות: ירוק תקין, כתום ממתין למיזוג, אדום פריסה חסרה או נכשלה
const TONE: Record<AppStatus, string> = { ok: '#2E7D5B', unmerged: '#B85F0B', not_deployed: '#B3392F', failed: '#B3392F' }
const fmt = (iso: string) => iso.split('-').reverse().join('.')
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const dayName = (iso: string) => DAYS[new Date(iso + 'T12:00:00').getDay()]

// שדרוג אפליקציות: דוח לילי מזוקק. מה נעשה ביום העבודה, ומה עוד לא מוזג או לא נפרס
export default function Upgrades() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState(false)
  const [pick, setPick] = useState(0)

  useEffect(() => {
    listReports().then(setReports).catch(() => setError(true))
  }, [])

  const r = reports?.[pick]
  const bad = r ? r.checked - r.ok : 0

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="flex items-center gap-3 text-3xl font-light"><Icon name="target" size={28} />שדרוג <b>אפליקציות</b></h1>
      <p className="mb-5 mt-1 text-mute">
        בכל לילה ב-<span className="num">04:00</span> נבדקות האפליקציות שעבדת עליהן.
        <br />
        הבדיקה: כל שינוי מוזג ל-main ונפרס ל-Vercel.
      </p>

      {error && <p className="rounded-lg bg-[#FBECEA] p-4 text-bad">הדוחות לא נטענו. אפשר לרענן את הדף.</p>}
      {!reports && !error && <div className="skeleton h-40" />}
      {reports && reports.length === 0 && <p className="rounded-lg bg-soft p-5">עוד אין דוח. הראשון ייכתב הלילה ב-04:00.</p>}

      {r && (
        <>
          {/* בחירת יום: הדוח האחרון ראשון */}
          {reports!.length > 1 && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="בחירת יום">
              {reports!.slice(0, 14).map((x, i) => (
                <button key={x.report_date} type="button" onClick={() => setPick(i)} aria-pressed={i === pick}
                  className={`btn !min-h-9 shrink-0 text-sm ${i === pick ? '!bg-navy !text-white' : ''}`}>
                  <span className="num">{fmt(x.report_date).slice(0, 5)}</span>
                  {x.checked > x.ok && <span className="h-2 w-2 rounded-full bg-bad" aria-label="דורש טיפול" />}
                </button>
              ))}
            </div>
          )}

          {/* מוקד: שורת התובנה של היום */}
          <section className="mb-6">
            <div className="text-sm text-mute">יום {dayName(r.report_date)}, <span className="num">{fmt(r.report_date)}</span></div>
            <p className="mt-1 text-2xl font-light leading-snug sm:text-3xl"><span className="marker">{r.headline}</span></p>
          </section>

          {/* שלושה מספרים: נבדקו, תקינות, דורשות טיפול */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Stat n={r.checked} label="נבדקו" color="#2E2E2B" />
            <Stat n={r.ok} label="מוזגו ונפרסו" color="#2E7D5B" />
            <Stat n={bad} label="דורשות טיפול" color={bad ? '#B3392F' : '#6B6F76'} />
          </div>

          {/* מה צריך לעשות: קודם הפעולה */}
          {r.todo.length > 0 && (
            <section className="mb-7 rounded-lg bg-[#FBECEA] p-4 sm:p-5">
              <h2 className="mb-2 text-lg font-semibold text-bad">מה צריך לעשות</h2>
              <ol className="list-inside list-decimal space-y-1.5">
                {r.todo.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </section>
          )}

          {/* מה נעשה: אפליקציה בשורה */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">מה נעשה</h2>
            <ul className="divide-y divide-line">
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
                    {a.todo && <div className="mt-1 text-bad"><b>לטיפול:</b> {a.todo}</div>}
                    {a.branches && a.branches.length > 0 && (
                      <div className="mt-1 text-sm text-mute">
                        ענפים פתוחים: {a.branches.map((b) => <span key={b.name} className="num ms-1" dir="ltr">{b.name} ({b.commits})</span>)}
                      </div>
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
