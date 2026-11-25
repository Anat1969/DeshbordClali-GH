import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon, { type IconName } from '../components/Icon'
import { useApp } from '../lib/ctx'
import { useTasks } from '../hooks/useTasks'
import { addDays as addDaysIso, todayIso } from '../lib/dateUtils'
import {
  addRule, cancelJob, closeDay, copyPrompt, CLAUDE_CODE, decide, dmy, EXEC_TEXT, forgetApprover, getDay, getOverview, hasApprover, hhmm,
  LEVEL_TEXT, listApps, listJobs, listRules, markReturn, requestWork, retryJob, ruleStatus, runNow, saveApprover, setBudget, setIntent, setPolicy,
  STATUS_TEXT, type Budget, type DayRow, type Job, type JobStatus, type Overview, type Policy, type RegApp, type Rule, type Run,
} from '../lib/office'

// המשרד: מערכת ההפעלה של העבודה. תדריך בוקר, סגירת ערב, החלטות, תור, הרשאות ולמידה, על תור אמיתי בשרת
type View = 'morning' | 'evening' | 'decisions' | 'queue' | 'policies' | 'learning'
const VIEWS: { key: View; label: string; icon: IconName }[] = [
  { key: 'morning', label: 'בוקר', icon: 'sun' },
  { key: 'evening', label: 'ערב', icon: 'moon' },
  { key: 'decisions', label: 'החלטות', icon: 'bulb' },
  { key: 'queue', label: 'תור ויומן', icon: 'clock' },
  { key: 'policies', label: 'הרשאות', icon: 'shield' },
  { key: 'learning', label: 'למידה', icon: 'book' },
]
const STATUS_INK: Record<JobStatus, string> = { proposed: '#B85F0B', queued: '#1A2B4A', running: '#2B6CD9', done: '#2E7D5B', failed: '#B3392F', rejected: '#6B6F76', canceled: '#6B6F76' }
const ilDate = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(iso))
const errText = (e: unknown) => {
  const c = (e as { code?: string })?.code
  return c === 'approver_required' ? 'הפעולה דורשת מפתח אישור. מזינים אותו פעם אחת במסך "הרשאות".' : c === 'no_backend' ? 'אין חיבור לשרת במצב הדגמה.' : 'הפעולה נכשלה. אפשר לנסות שוב.'
}

export default function Office() {
  const app = useApp()
  const [params, setParams] = useSearchParams()
  const view = (VIEWS.some((v) => v.key === params.get('v')) ? params.get('v') : new Date().getHours() >= 17 ? 'evening' : 'morning') as View
  const [ov, setOv] = useState<Overview | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<Job | null>(null) // חלון "פתח לביצוע ב-Claude Code"

  const load = useCallback(() => getOverview().then((o) => (setOv(o), setError(false))).catch(() => setError(true)), [])
  useEffect(() => { load() }, [load])
  const go = (v: View) => setParams(v === 'morning' ? {} : { v }, { replace: true })

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try { await fn(); app.toast(ok); await load() } catch (e) { app.toast(errText(e)) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-3xl font-light"><Icon name="briefcase" size={28} /><span>ה<b>משרד</b></span></h1>
          <p className="m-0 mt-1 text-mute">צוות שעובד גם כשאת לא כאן. את מחליטה, הוא מבצע, בודק ומתעד.</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto rounded-lg bg-soft p-1" aria-label="מסכי המשרד">
          {VIEWS.map((v) => (
            <button key={v.key} type="button" onClick={() => go(v.key)} aria-pressed={view === v.key}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-[15px] transition-colors ${view === v.key ? 'bg-white font-semibold text-navy shadow-btn' : 'text-ink hover:bg-white/60'}`}>
              <Icon name={v.icon} size={18} />{v.label}
              {v.key === 'decisions' && ov && ov.decisions.length > 0 && <span className="num rounded-full bg-[#B85F0B] px-1.5 text-xs font-semibold text-white">{ov.decisions.length}</span>}
            </button>
          ))}
        </nav>
      </header>

      {error && <p className="rounded-lg bg-[#FBECEA] p-4 text-bad">המשרד לא נטען. אפשר לרענן את הדף, ואם זה חוזר: הפונקציה yoman-office לא זמינה.</p>}
      {!ov && !error && <div className="skeleton h-72" />}
      {ov && view === 'morning' && <Morning ov={ov} go={go} onOpen={setOpen} />}
      {ov && view === 'evening' && <Evening ov={ov} reload={load} />}
      {ov && view === 'decisions' && <Decisions ov={ov} busy={busy} act={act} onOpen={setOpen} />}
      {ov && view === 'queue' && <Queue ov={ov} busy={busy} act={act} onOpen={setOpen} />}
      {ov && view === 'policies' && <Policies ov={ov} busy={busy} act={act} reload={load} />}
      {ov && view === 'learning' && <Learning approver={ov.approver} />}
      {open && <OpenInClaude job={open} approver={!!ov?.approver} onClose={() => setOpen(null)} onApprove={() => act(() => decide(open.id, 'approve'), 'נשלח למשמרת הלילה').then(() => setOpen(null))} />}
    </div>
  )
}

// ---------- בוקר: התדריך של מנהל המשרד ----------
type Step = { title: string; why: string; to?: string; href?: string; view?: View; cta: string; icon: IconName }
function Morning({ ov, go, onOpen }: { ov: Overview; go: (v: View) => void; onOpen: (j: Job) => void }) {
  const app = useApp()
  const nav = useNavigate()
  const { tasks } = useTasks()
  const today = todayIso()
  const events = app.ev.events.filter((e) => e.event_date === today).sort((a, b) => (a.event_time ?? '99').localeCompare(b.event_time ?? '99'))
  const openTasks = tasks.filter((t) => !t.done).sort((a, b) => a.created_at.localeCompare(b.created_at))

  // סדר מומלץ: קודם מה שמשחרר את הצוות (החלטות), אחר כך מה שנשבר, ואז היום שלך. עד חמישה צעדים
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = []
    ov.decisions.slice(0, 2).forEach((d) => s.push({ title: `להחליט: ${d.title}`, why: d.value ?? 'הצוות מחכה להחלטה כדי להמשיך.', view: 'decisions', cta: 'להחלטה', icon: 'bulb' }))
    ov.failed.slice(0, 1).forEach((f) => s.push({ title: `לבדוק כישלון: ${f.title}`, why: f.error ?? 'העבודה נכשלה אחרי כל הניסיונות.', view: 'queue', cta: 'לתור', icon: 'refresh' }))
    ov.health.down.slice(0, 1).forEach((h) => s.push({ title: `${h.app_name} לא עונה`, why: `הכתובת החזירה ${h.status || 'שגיאת רשת'} ${h.fail_streak} פעמים ברצף. עבודת תיקון כבר בתור.`, href: h.url, cta: 'לאתר', icon: 'globe' }))
    if (events[0]) s.push({ title: `להתכונן: ${events[0].title}`, why: `${events[0].event_time ? `ב-${events[0].event_time.slice(0, 5)}. ` : ''}${events.length > 1 ? `ועוד ${events.length - 1} אירועים היום.` : 'האירוע היחיד היום.'}`, to: '/calendar', cta: 'ליומן', icon: 'calendar' })
    ov.stale?.projects.slice(0, 1).forEach((p) => s.push({ title: `לעדכן פרויקט: ${p.name}`, why: `לא עודכן ${p.days} ימים${p.next_step ? `. הצעד הבא: ${p.next_step}` : ''}.`, to: '/projects', cta: 'לפרויקטים', icon: 'chart' }))
    if (openTasks[0]) s.push({ title: `משימה ותיקה: ${openTasks[0].text}`, why: `${openTasks.length} משימות פתוחות. זו הוותיקה ביותר.`, to: '/tasks', cta: 'למשימות', icon: 'check' })
    return s
  }, [ov, events, openTasks])
  const shown = steps.slice(0, 5)
  const hidden = steps.length - shown.length

  const progressed = ov.progressed.code.length + ov.progressed.routine.length
  const headline = progressed
    ? `בזמן שלא עבדת: ${ov.progressed.code.length ? `${ov.progressed.code.length} עבודות קוד נסגרו, ` : ''}${ov.progressed.routine.length} שגרות רצו.`
    : 'הלילה היה שקט. הצוות מוכן להתחיל.'
  const take = (s: Step) => {
    markReturn('תוכנית העבודה')
    if (s.view) go(s.view)
    else if (s.to) nav(s.to)
    else if (s.href) window.open(s.href, '_blank', 'noopener')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
      <section className="min-w-0">
        <p className="m-0 text-sm text-mute">{dmy(new Date().toISOString())} · מאז {hhmm(ov.since)} {ov.yesterday?.closed_at ? '(סגירת אתמול)' : ''}</p>
        <p className="m-0 mt-1 text-2xl font-light leading-snug sm:text-[34px]"><span className="marker">{headline}</span></p>
        {ov.decisions.length > 0 && <p className="m-0 mt-1 text-lg"><b className="text-[#B85F0B]">{ov.decisions.length} החלטות</b> מחכות לך, והן הדבר היחיד שעוצר את הצוות.</p>}

        <Intent initial={ov.today?.intent ?? ''} />

        <h2 className="m-0 mb-1 mt-6 text-xl font-semibold">מה דורש אותך היום, בסדר מומלץ</h2>
        <p className="m-0 mb-3 text-sm text-mute">רק מה שאי אפשר לעשות בלעדייך. קודם החלטות, כי הן משחררות עבודה שלמה.</p>
        {shown.length === 0 ? (
          <p className="rounded-lg bg-[#EAF5EF] p-4 text-good">אין היום דבר שדורש אותך. הזמן פנוי לחשיבה וליצירה.</p>
        ) : (
          <ol className="m-0 grid list-none gap-2 p-0">
            {shown.map((s, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-btn">
                <span className="num w-7 shrink-0 text-center text-2xl font-light text-mute">{i + 1}</span>
                <Icon name={s.icon} size={20} className="shrink-0 text-navy" />
                <div className="min-w-0 flex-1">
                  <div className="break-words text-[17px] font-semibold text-[#111111]">{s.title}</div>
                  <div className="break-words text-sm text-mute">{s.why}</div>
                </div>
                <button type="button" className="btn shrink-0 !min-h-10 !px-3 text-sm" onClick={() => take(s)} aria-label={s.cta}><span className="hidden sm:inline">{s.cta}</span><Icon name="chevronL" size={16} /></button>
              </li>
            ))}
          </ol>
        )}
        {hidden > 0 && <p className="m-0 mt-2 text-sm text-mute">עוד {hidden} דברים נדחו להמשך, כדי להגן על הזמן שלך.</p>}

        <Metrics ov={ov} />
      </section>

      <aside className="grid min-w-0 content-start gap-4">
        <Panel title="מה התקדם בזמן שלא עבדת" icon="check">
          {progressed === 0 && <Empty>עוד לא רצה עבודה מאז הסגירה האחרונה.</Empty>}
          {ov.progressed.code.map((c) => (
            <Line key={c.id} ok title={c.title} sub={`${c.app_name ?? c.repo ?? ''}${c.finished_at ? ` · ${hhmm(c.finished_at)}` : ''}`} href={c.live_url ?? undefined} />
          ))}
          {ov.progressed.routine.map((r) => <Line key={r.kind} ok title={r.label} sub={r.summary} />)}
          {ov.yesterday?.night_result?.summary && <p className="m-0 mt-2 rounded-md bg-soft p-2 text-sm"><b>משמרת הלילה:</b> {ov.yesterday.night_result.summary}</p>}
        </Panel>

        <Panel title="מה הצוות מבצע היום" icon="briefcase">
          {ov.team.length === 0 && <Empty>אין עבודה בתור. השגרות רצות לבד כל 10 דקות.</Empty>}
          {ov.team.slice(0, 6).map((j) => (
            <Line key={j.id} title={j.title} sub={`${EXEC_TEXT[j.executor]} · ${STATUS_TEXT[j.status]}`} dot={STATUS_INK[j.status]} onClick={j.executor === 'claude_code' ? () => onOpen(j) : undefined} />
          ))}
          {ov.team.length > 6 && <button type="button" className="mt-1 text-sm text-navy underline-offset-2 hover:underline" onClick={() => go('queue')}>ועוד {ov.team.length - 6} בתור</button>}
        </Panel>

        <Panel title="הזדמנויות חדשות" icon="spark">
          {ov.decisions.filter((d) => d.kind === 'upgrade').length === 0 && <Empty>סריקת החדשנות רצה במוצאי שבת. ההצעות יחכו כאן ביום ראשון.</Empty>}
          {ov.decisions.filter((d) => d.kind === 'upgrade').slice(0, 3).map((d) => (
            <Line key={d.id} title={d.title} sub={`${d.app_name ?? 'כללי'} · תרומה ${d.score}`} dot="#8E44C8" onClick={() => go('decisions')} />
          ))}
        </Panel>

        <Panel title="זמינות האפליקציות" icon="globe">
          <p className="m-0 text-[15px]"><b className="num">{ov.health.ok}</b> מתוך <b className="num">{ov.health.checked}</b> עונות{ov.health.last ? ` · נבדק ב-${hhmm(ov.health.last)}` : ''}.</p>
          {ov.health.down.map((h) => <Line key={h.url} title={h.app_name} sub={`${h.status || 'אין תשובה'} · ${h.fail_streak} פעמים ברצף`} dot="#B3392F" href={h.url} />)}
        </Panel>
      </aside>
    </div>
  )
}

// הכוונה להיום: משפט אחד. נשמר לבד כשיוצאים מהשדה
function Intent({ initial }: { initial: string }) {
  const [v, setV] = useState(initial)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const save = async () => {
    if (v === initial && saved === 'idle') return
    setSaved('saving')
    try { await setIntent(v); setSaved('saved') } catch { setSaved('error') }
  }
  return (
    <label className="mt-4 block">
      <span className="label">מה הכי חשוב להשיג היום? (משפט אחד, ייכנס לסיכום הערב)</span>
      <div className="flex items-center gap-2">
        <input className="field" value={v} maxLength={400} onChange={(e) => (setV(e.target.value), setSaved('idle'))} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())} placeholder="למשל: לסגור את האפיון של תיק הבניין" />
        <span className="w-14 shrink-0 text-sm text-mute" role="status">{saved === 'saving' ? 'שומר' : saved === 'saved' ? 'נשמר' : saved === 'error' ? <span className="text-bad">נכשל</span> : ''}</span>
      </div>
    </label>
  )
}

// מדדי הצלחה: מה נחסך, מה בוצע לבד, ומה זה עלה. שבוע אחרון
function Metrics({ ov }: { ov: Overview }) {
  const m = ov.metrics
  const items: { n: string; label: string; color: string; note?: string }[] = [
    { n: m.minutes_saved >= 60 ? `${Math.round(m.minutes_saved / 6) / 10}` : String(m.minutes_saved), label: m.minutes_saved >= 60 ? 'שעות נחסכו' : 'דקות נחסכו', color: '#2E7D5B', note: 'הערכה' },
    { n: String(m.auto_actions), label: 'פעולות עצמאיות', color: '#1A2B4A' },
    { n: String(m.upgrades_done), label: 'שדרוגים ותיקונים', color: '#8E44C8' },
    { n: String(m.failures), label: 'תקלות', color: m.failures ? '#B3392F' : '#2E7D5B' },
    { n: `$${m.usd_week.toFixed(2)}`, label: `עלות AI · ${Math.round(m.tokens_week / 1000)}K טוקנים`, color: '#2E2E2B' },
  ]
  return (
    <section className="mt-6" aria-label="מדדי השבוע">
      <h2 className="m-0 mb-2 text-base font-semibold text-mute">השבוע של המשרד</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {items.map((i) => (
          <div key={i.label} className="rounded-lg bg-soft p-3">
            <div className="num text-2xl font-light" style={{ color: i.color }}>{i.n}</div>
            <div className="text-sm leading-tight">{i.label}{i.note && <span className="text-mute"> ({i.note})</span>}</div>
          </div>
        ))}
      </div>
      <p className="m-0 mt-1 text-xs text-mute">החיסכון מחושב מזמן העבודה הידנית שכל סוג פעולה מחליף (מוגדר במסך ההרשאות). העלות מחושבת מהטוקנים ומהמחיר של כל מודל.</p>
    </section>
  )
}

// ---------- ערב: סיכום, ותוכנית הלילה ----------
function Evening({ ov, reload }: { ov: Overview; reload: () => void }) {
  const app = useApp()
  const { tasks } = useTasks()
  const [day, setDay] = useState<{ row: DayRow | null; queued: Job[]; budget: Budget } | null>(null)
  const [note, setNote] = useState('')
  const [learned, setLearned] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { getDay().then(setDay).catch(() => app.toast('נתוני היום לא נטענו')) }, [app])

  const today = todayIso(), tomorrow = addDaysIso(today, 1)
  const doneToday = tasks.filter((t) => t.done && t.done_at && ilDate(t.done_at) === today)
  const tomorrowEv = app.ev.events.filter((e) => e.event_date === tomorrow).sort((a, b) => (a.event_time ?? '99').localeCompare(b.event_time ?? '99'))
  const row = day?.row
  const closed = !!row?.closed_at
  const cap = day?.budget.night_sessions ?? 3
  const tonight = (day?.queued ?? []).slice(0, cap)

  const close = async () => {
    setBusy(true)
    try { const r = await closeDay(note, learned); setDay((d) => d && { ...d, row: r.row }); app.toast('היום נסגר ותוכנית הלילה מוכנה'); reload() } catch (e) { app.toast(errText(e)) } finally { setBusy(false) }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
      <section className="min-w-0">
        {closed && row?.evening ? (
          <>
            <p className="m-0 text-sm text-mute">היום נסגר ב-{hhmm(row.closed_at!)}</p>
            <div className="mt-1 text-2xl font-light leading-snug sm:text-3xl">{row.evening.story.split('\n').map((l, i) => <p key={i} className="m-0">{i === 0 ? <span className="marker">{l}</span> : l}</p>)}</div>
          </>
        ) : (
          <p className="m-0 text-2xl font-light leading-snug sm:text-3xl"><span className="marker">שבע שאלות, ואז הצוות לוקח מכאן.</span></p>
        )}

        <ol className="m-0 mt-5 grid list-none gap-3 p-0">
          <Q n={1} title="מה רצינו להשיג היום?">{ov.today?.intent ? <b>{ov.today.intent}</b> : <span className="text-mute">לא נקבעה כוונה. אפשר לקבוע אותה מחר בבוקר, בראש מסך הבוקר.</span>}</Q>
          <Q n={2} title="מה השגנו בפועל?">
            {doneToday.length + ov.progressed.code.length === 0 ? <span className="text-mute">לא נסגרו משימות היום.</span> : (
              <ul className="m-0 ps-5">{doneToday.map((t) => <li key={t.id}>{t.text}</li>)}{ov.progressed.code.map((c) => <li key={c.id}>{c.title} <span className="text-mute">(הצוות)</span></li>)}</ul>
            )}
          </Q>
          <Q n={3} title="מה השתפר?">{ov.progressed.routine.length ? ov.progressed.routine.map((r) => <div key={r.kind}><b>{r.label}:</b> {r.summary}</div>) : <span className="text-mute">אין שינוי שנמדד היום.</span>}</Q>
          <Q n={4} title="מה למדנו?">
            <textarea className="field min-h-20" value={learned} onChange={(e) => setLearned(e.target.value)} maxLength={600} placeholder="תובנה אחת. היא תיכנס ל'למידה' כהצעה לכלל, ואת מחליטה אם היא קבועה." />
          </Q>
          <Q n={5} title="מה נשאר פתוח, ולמה?">
            {ov.decisions.length + ov.failed.length === 0 ? <span className="text-mute">שום דבר לא נתקע.</span> : (
              <ul className="m-0 ps-5">
                {ov.decisions.slice(0, 4).map((d) => <li key={d.id}>{d.title} <span className="text-mute">· מחכה להחלטה שלך</span></li>)}
                {ov.failed.slice(0, 3).map((f) => <li key={f.id}>{f.title} <span className="text-bad">· {f.error}</span></li>)}
              </ul>
            )}
          </Q>
          <Q n={6} title="מה הצוות יכול להשלים הלילה?">
            {tonight.length === 0 ? <span className="text-mute">אין עבודת קוד מאושרת. השגרות ימשיכו לרוץ. אפשר לאשר הצעות במסך "החלטות".</span> : (
              <ul className="m-0 ps-5">{tonight.map((j) => <li key={j.id}>{j.title} <span className="num text-mute" dir="ltr">{j.repo}</span></li>)}</ul>
            )}
            {(day?.queued.length ?? 0) > cap && <p className="m-0 mt-1 text-sm text-mute">עוד {(day!.queued.length) - cap} עבודות יחכו ללילה הבא (תקציב: {cap} שיחות בלילה).</p>}
          </Q>
          <Q n={7} title="מה נכון להכין למחר?">
            {tomorrowEv.length === 0 ? <span className="text-mute">אין אירועים מחר.</span> : <ul className="m-0 ps-5">{tomorrowEv.map((e) => <li key={e.id}>{e.event_time ? <span className="num">{e.event_time.slice(0, 5)} </span> : ''}{e.title}{e.location ? `, ${e.location}` : ''}</li>)}</ul>}
            <textarea className="field mt-2 min-h-16" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="הערה לעצמך למחר (לא חובה)" />
          </Q>
        </ol>
        <button type="button" className="btn btn-primary mt-4 w-full sm:w-auto" disabled={busy} onClick={close}>
          <Icon name="moon" size={18} />{closed ? 'עדכון הסגירה ותוכנית הלילה' : 'סגירת היום ויצירת תוכנית הלילה'}
        </button>
        <p className="m-0 mt-2 text-sm text-mute">אם לא תסגרי עד 21:00, המשרד סוגר לבד מהנתונים, ותוכנית הלילה נוצרת בכל מקרה.</p>
      </section>

      <aside className="grid min-w-0 content-start gap-4">
        <Panel title="תוכנית הלילה" icon="moon">
          {!row?.night_plan && <Empty>התוכנית נוצרת בסגירת היום.</Empty>}
          {row?.night_plan && (
            <>
              <p className="m-0 text-sm text-mute">משמרת הלילה מתחילה ב-21:31. תקציב: {row.night_plan.budget.sessions} שיחות, עד {row.night_plan.budget.deploys} פריסות, ו-{row.night_plan.budget.reserve} שמורות לך למחר.</p>
              {row.night_plan.jobs.map((j) => <Line key={j.id} title={j.title} sub={j.repo ?? ''} dot="#1A2B4A" />)}
              {row.night_plan.server.length > 0 && <p className="m-0 mt-2 text-sm"><b>שגרות:</b> {row.night_plan.server.join(' · ')}</p>}
              {row.night_plan.deferred.length > 0 && <p className="m-0 mt-2 text-sm text-mute">נדחו: {row.night_plan.deferred.map((d) => d.title).join(', ')}.</p>}
            </>
          )}
        </Panel>
        <Metrics ov={ov} />
      </aside>
    </div>
  )
}

function Q({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-lg bg-white p-4 shadow-btn">
      <h3 className="m-0 mb-1.5 flex items-baseline gap-2 text-lg font-semibold"><span className="num font-light text-mute">{n}.</span>{title}</h3>
      <div className="text-[16px] leading-relaxed">{children}</div>
    </li>
  )
}

// ---------- החלטות: הצעות שדרוג ובקשות, כל אחת משויכת לריפו אחד ----------
function Decisions({ ov, busy, act, onOpen }: { ov: Overview; busy: boolean; act: (fn: () => Promise<unknown>, ok: string) => Promise<void>; onOpen: (j: Job) => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
      <section className="min-w-0">
        <h2 className="m-0 mb-1 text-xl font-semibold">מחכות להחלטה שלך <span className="text-base font-normal text-mute">· מדורגות לפי התרומה לעבודה שלך</span></h2>
        {!ov.approver && <p className="m-0 mb-3 rounded-lg bg-mark p-3 text-[15px]">כדי לאשר או לדחות, מזינים פעם אחת את מפתח האישור במסך "הרשאות". בלעדיו אפשר לקרוא ולהעתיק בלבד.</p>}
        {ov.decisions.length === 0 && <Empty>אין הצעות פתוחות. הסריקה הבאה במוצאי שבת, ואפשר גם לשלוח בקשה משלך.</Empty>}
        <ol className="m-0 grid list-none gap-4 p-0">
          {ov.decisions.map((j, i) => <Proposal key={j.id} job={j} n={i + 1} busy={busy} approver={ov.approver} act={act} onOpen={onOpen} />)}
        </ol>
      </section>
      <aside className="min-w-0"><RequestForm onDone={() => act(async () => undefined, 'הבקשה נשמרה')} /></aside>
    </div>
  )
}

function Proposal({ job: j, n, busy, approver, act, onOpen }: { job: Job; n: number; busy: boolean; approver: boolean; act: (fn: () => Promise<unknown>, ok: string) => Promise<void>; onOpen: (j: Job) => void }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const fields: [string, string | null][] = [
    ['מה זוהה', j.found], ['למה זה משמעותי', j.why], ['הפתרון המוצע', j.solution], ['הערך שיתקבל', j.value],
    ['האפליקציה', j.app_name], ['עלויות, תלויות וסיכונים', [j.risks, j.depends_on?.length ? `תלוי ב: ${j.depends_on.join(', ')}` : ''].filter(Boolean).join(' ') || null],
  ]
  const reject = () => {
    const note = window.prompt('למה לא? (נשמר כהחלטה, כדי שלא יוצע שוב דבר דומה)') ?? undefined
    if (note === undefined) return
    act(() => decide(j.id, 'reject', note), 'נדחה ונשמר כהחלטה')
  }
  return (
    <li className="rounded-lg bg-white p-4 shadow-btn sm:p-5" style={{ borderTop: `4px solid ${j.level === 3 ? '#8E44C8' : '#B85F0B'}` }}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="num text-xl font-light text-mute">{n}.</span>
        <h3 className="m-0 min-w-0 flex-1 break-words text-xl font-semibold text-[#111111]">{j.title}</h3>
        <span className="rounded-md bg-soft px-2 py-0.5 text-sm">רמה {j.level} · {LEVEL_TEXT[j.level]}</span>
        <span className="num rounded-md bg-[#F3ECFA] px-2 py-0.5 text-sm text-[#6F2FA3]">תרומה {j.score}</span>
      </div>

      {/* זהות הביצוע: איפה בדיוק זה ירוץ */}
      <div className={`mt-3 grid gap-x-4 gap-y-1 rounded-md p-3 text-sm sm:grid-cols-2 ${j.repo ? 'bg-[#EEF2F8]' : 'bg-[#FBECEA]'}`}>
        <div><span className="text-mute">ריפו: </span>{j.repo ? <a href={`https://github.com/${j.repo}`} target="_blank" rel="noopener" className="num font-semibold text-navy underline-offset-2 hover:underline" dir="ltr">{j.repo}</a> : <b className="text-bad">לא אומת מול רישום האפליקציות{j.payload?.suggested_repo ? ` (הוצע: ${j.payload.suggested_repo})` : ''}</b>}</div>
        <div><span className="text-mute">ענף: </span><span className="num" dir="ltr">{j.branch ?? 'office/… חדש מ-main'}</span></div>
        <div><span className="text-mute">תיקייה: </span>{j.workdir ?? 'שורש הריפו'}</div>
        <div><span className="text-mute">מבצע: </span>{EXEC_TEXT[j.executor]}</div>
      </div>

      <dl className="m-0 mt-3 grid gap-2">
        {fields.filter(([, v]) => v).map(([k, v], i) => (
          <div key={k} className="grid gap-1 sm:grid-cols-[150px_1fr]"><dt className="text-sm text-mute"><span className="num">{i + 1}.</span> {k}</dt><dd className="m-0 break-words text-[16px] leading-relaxed">{v}</dd></div>
        ))}
        <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
          <dt className="text-sm text-mute"><span className="num">7.</span> פרומפט לביצוע</dt>
          <dd className="m-0">{j.prompt ? <button type="button" className="text-navy underline-offset-2 hover:underline" onClick={() => setShowPrompt((s) => !s)}>{showPrompt ? 'הסתרה' : 'הצגת הפרומפט המלא, כולל בדיקת הסף'}</button> : <span className="text-bad">אין פרומפט עד שהריפו מאומת</span>}</dd>
        </div>
      </dl>
      {showPrompt && j.prompt && <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-soft p-3 text-sm leading-relaxed">{j.prompt}</pre>}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" className="btn btn-primary col-span-2" disabled={busy || !j.repo || !approver} onClick={() => act(() => decide(j.id, 'approve'), 'אושר. נכנס למשמרת הלילה')} title={approver ? '' : 'דורש מפתח אישור'}>
          <Icon name="moon" size={18} />שליחה למשמרת הלילה
        </button>
        <button type="button" className="btn" disabled={!j.repo || !j.prompt} onClick={() => onOpen(j)}><Icon name="external" size={16} />פתח ב-Claude Code</button>
        <button type="button" className="btn btn-danger" disabled={busy || !approver} onClick={reject}><Icon name="x" size={16} />דחייה</button>
      </div>
    </li>
  )
}

// בקשה חדשה למשמרת: בוחרים אפליקציה מהרישום (כך הריפו תמיד נכון), ומתארים מה לעשות
function RequestForm({ onDone }: { onDone: () => void }) {
  const app = useApp()
  const [apps, setApps] = useState<RegApp[]>([])
  const [q, setQ] = useState('')
  const [repo, setRepo] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { listApps().then(setApps).catch(() => undefined) }, [])
  const pick = apps.find((a) => a.repo === repo)
  const matches = q.trim() ? apps.filter((a) => (a.name + ' ' + a.repo).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : []
  const send = async () => {
    setBusy(true)
    try { await requestWork(repo, text); setText(''); setRepo(''); setQ(''); onDone() } catch (e) { app.toast(errText(e)) } finally { setBusy(false) }
  }
  return (
    <Panel title="בקשה חדשה למשמרת הלילה" icon="send">
      <p className="m-0 mb-2 text-sm text-mute">מה לעשות באפליקציה, בזמן שאת ישנה. עם מפתח אישור זה נכנס ישר לתור, ובלעדיו מחכה להחלטה.</p>
      {pick ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-[#EEF2F8] p-2">
          <span className="min-w-0"><b>{pick.name}</b> <span className="num block break-all text-sm" dir="ltr">{pick.repo}</span></span>
          <button type="button" className="btn !min-h-9 !px-2 text-sm" onClick={() => setRepo('')}>החלפה</button>
        </div>
      ) : (
        <div className="mb-2">
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`חיפוש אפליקציה (${apps.length} עם ריפו)`} />
          {matches.length > 0 && (
            <ul className="m-0 mt-1 list-none rounded-md bg-white p-1 shadow-pop">
              {matches.map((a) => <li key={a.repo}><button type="button" className="w-full rounded px-2 py-1.5 text-right hover:bg-soft" onClick={() => (setRepo(a.repo), setQ(''))}>{a.name} <span className="num text-xs text-mute" dir="ltr">{a.repo}</span></button></li>)}
            </ul>
          )}
        </div>
      )}
      <textarea className="field min-h-28" value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} placeholder="מה לעשות, ומה ייחשב הצלחה" />
      <button type="button" className="btn btn-primary mt-2 w-full" disabled={busy || !repo || text.trim().length < 5} onClick={send}><Icon name="send" size={16} />שליחה</button>
    </Panel>
  )
}

// ---------- פתיחה לביצוע ב-Claude Code, עם הגנה מפני ריפו שגוי ----------
function OpenInClaude({ job: j, approver, onClose, onApprove }: { job: Job; approver: boolean; onClose: () => void; onApprove: () => void }) {
  const [copied, setCopied] = useState<boolean | null>(null)
  const session = j.payload?.session ?? null
  useEffect(() => { copyPrompt(j).then(setCopied) }, [j])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-label="פתיחה לביצוע ב-Claude Code" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-lg bg-white p-5 shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <h2 className="m-0 text-xl font-semibold">פתיחה לביצוע ב-Claude Code</h2>
          <button type="button" className="btn !min-h-9 !w-9 !p-0" aria-label="סגירה" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <p className="m-0 mt-3 text-sm text-mute">הפרומפט מיועד לריפו הזה בלבד:</p>
        <p className="num m-0 mt-1 break-all rounded-md bg-[#EEF2F8] p-3 text-center text-2xl font-semibold text-navy" dir="ltr">{j.repo}</p>
        <ol className="m-0 mt-4 grid gap-2 ps-5 text-[16px]">
          <li>{copied === null ? 'מעתיק את הפרומפט...' : copied ? <><b className="text-good">הפרומפט הועתק.</b> בראשו בדיקת סף: אם השיחה פתוחה בריפו אחר, Claude עוצר לפני כל שינוי.</> : <span className="text-bad">ההעתקה נחסמה בדפדפן. אפשר להעתיק ידנית מתוך "הצגת הפרומפט".</span>}</li>
          {session ? (
            <li>פותחים את <b>השיחה שנוצרה מראש על הריפו הזה</b>, ומדביקים.</li>
          ) : (
            <li>ב-Claude Code בוחרים את <b className="num" dir="ltr">{j.repo}</b> לפני ההדבקה. אין קישור שבוחר ריפו מראש, ולכן הבדיקה בראש הפרומפט היא שכבת ההגנה.</li>
          )}
        </ol>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a className="btn btn-primary" href={session ?? CLAUDE_CODE} target="_blank" rel="noopener"><Icon name="external" size={16} />{session ? 'פתיחת השיחה של האפליקציה' : 'פתיחת Claude Code'}</a>
          <a className="btn" href={`https://github.com/${j.repo}`} target="_blank" rel="noopener"><Icon name="globe" size={16} />הריפו ב-GitHub</a>
        </div>
        {j.status === 'proposed' && (
          <div className="mt-4 rounded-md bg-soft p-3 text-sm">
            <b>הדרך הבטוחה ביותר:</b> משמרת הלילה יוצרת שיחה חדשה ישר על הריפו הזה, כך שאין שלב בחירה ידני.
            <button type="button" className="btn mt-2 w-full" disabled={!approver} onClick={onApprove}><Icon name="moon" size={16} />{approver ? 'שליחה למשמרת הלילה במקום' : 'שליחה למשמרת דורשת מפתח אישור'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- תור ויומן ריצות ----------
function Queue({ ov, busy, act, onOpen }: { ov: Overview; busy: boolean; act: (fn: () => Promise<unknown>, ok: string) => Promise<void>; onOpen: (j: Job) => void }) {
  const app = useApp()
  const [filter, setFilter] = useState<'open' | 'done' | 'failed' | 'all'>('open')
  const [data, setData] = useState<{ jobs: Job[]; runs: Run[] } | null>(null)
  const load = useCallback(() => listJobs(filter === 'open' ? ['proposed', 'queued', 'running'] : filter === 'done' ? ['done'] : filter === 'failed' ? ['failed', 'rejected', 'canceled'] : undefined).then(setData).catch(() => app.toast('התור לא נטען')), [filter, app])
  useEffect(() => { load() }, [load])
  const run = async () => {
    try {
      const r = await runNow()
      app.toast(r.skipped ? 'משמרת אחרת כבר רצה עכשיו' : `רצו ${r.done?.length ?? 0} עבודות`)
      load()
    } catch (e) { app.toast(errText(e)) }
  }
  const doAct = (fn: () => Promise<unknown>, ok: string) => act(fn, ok).then(load)
  const F: [typeof filter, string][] = [['open', 'פתוח'], ['done', 'הושלם'], ['failed', 'נכשל ובוטל'], ['all', 'הכול']]
  return (
    <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1" role="group" aria-label="סינון">
            {F.map(([k, l]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`btn !min-h-9 !px-3 text-sm ${filter === k ? '!bg-navy !text-white' : ''}`}>{l}</button>)}
          </div>
          <button type="button" className="btn !min-h-9 text-sm" onClick={run}><Icon name="play" size={16} />הרצת משמרת השרת עכשיו</button>
        </div>
        {!data && <div className="skeleton h-40" />}
        {data && data.jobs.length === 0 && <Empty>אין עבודות בסינון הזה.</Empty>}
        <ul className="m-0 grid list-none gap-2 p-0">
          {data?.jobs.map((j) => (
            <li key={j.id} className="rounded-lg bg-white p-3 shadow-btn" style={{ borderInlineStart: `4px solid ${STATUS_INK[j.status]}` }}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <b className="min-w-0 flex-1 break-words">{j.title}</b>
                <span className="text-sm font-semibold" style={{ color: STATUS_INK[j.status] }}>{STATUS_TEXT[j.status]}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-mute">
                <span>רמה {j.level}</span><span>{EXEC_TEXT[j.executor]}</span>
                {j.repo && <span className="num" dir="ltr">{j.repo}</span>}
                <span>ניסיון {j.attempts}/{j.max_attempts}</span>
                <span>עודכן {dmy(j.updated_at)} {hhmm(j.updated_at)}</span>
              </div>
              {j.error && <p className="m-0 mt-1 break-words text-sm text-bad">{j.error}</p>}
              {j.decided_note && <p className="m-0 mt-1 text-sm text-mute">{j.decided_note}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {j.executor === 'claude_code' && j.repo && j.prompt && <button type="button" className="btn !min-h-9 !px-3 text-sm" onClick={() => onOpen(j)}><Icon name="external" size={14} />פתח ב-Claude Code</button>}
                {['proposed', 'queued'].includes(j.status) && <button type="button" className="btn btn-danger !min-h-9 !px-3 text-sm" disabled={busy} onClick={() => doAct(() => cancelJob(j.id), 'בוטל')}><Icon name="x" size={14} />ביטול</button>}
                {j.status === 'failed' && <button type="button" className="btn !min-h-9 !px-3 text-sm" disabled={busy || !ov.approver} onClick={() => doAct(() => retryJob(j.id), 'חזר לתור')}><Icon name="refresh" size={14} />ניסיון חוזר</button>}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <aside className="min-w-0">
        <Panel title="יומן ריצות" icon="note">
          {data?.runs.length === 0 && <Empty>עוד לא רצה עבודה.</Empty>}
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {data?.runs.slice(0, 40).map((r) => (
              <li key={r.id} className="text-sm leading-snug">
                <span className="me-1 inline-block h-2 w-2 rounded-full" style={{ background: r.ok ? '#2E7D5B' : '#B3392F' }} aria-label={r.ok ? 'הצליח' : 'נכשל'} />
                <span className="num text-mute">{dmy(r.finished_at)} {hhmm(r.finished_at)}</span> {r.summary}
                {r.tokens > 0 && <span className="num text-mute"> · {r.tokens.toLocaleString('en-US')} טוקנים{r.model ? ` · ${r.model}` : ''}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      </aside>
    </div>
  )
}

// ---------- הרשאות, תקציב ומפתח אישור ----------
const SAFETY = [
  'לעולם לא force push, מחיקת ענף שאינו של המשרד, מחיקת נתונים, או שינוי סודות והגדרות פרויקט.',
  'לפני מיזוג: בנייה ובדיקות ירוקות. כישלון עוצר את המיזוג.',
  'פריסה שנכשלה חוזרת לגרסה התקינה הקודמת (git revert).',
  'רמה 3 תמיד מחכה להחלטה שלך. המערכת לא משנה הרשאות או כללי בטיחות בעצמה.',
  'כל פרומפט פותח בבדיקת סף: ריפו שגוי עוצר את העבודה לפני כל שינוי.',
  'תמיד נשארות פריסות שמורות לעבודה שלך למחר, לפי התקציב.',
]
function Policies({ ov, busy, act, reload }: { ov: Overview; busy: boolean; act: (fn: () => Promise<unknown>, ok: string) => Promise<void>; reload: () => void }) {
  const app = useApp()
  const [key, setKey] = useState('')
  const [b, setB] = useState<Budget>(ov.budget)
  const byLevel = [1, 2, 3].map((l) => ({ l: l as 1 | 2 | 3, items: ov.policies.filter((p) => p.level === l) }))
  const save = async () => {
    const ok = await saveApprover(key)
    app.toast(ok ? 'מפתח האישור נשמר במכשיר הזה' : 'המפתח לא נכון')
    if (ok) { setKey(''); reload() }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
      <section className="min-w-0">
        {byLevel.map(({ l, items }) => (
          <div key={l} className="mb-5">
            <h2 className="m-0 mb-1 text-lg font-semibold">רמה {l}: {LEVEL_TEXT[l]}</h2>
            <p className="m-0 mb-2 text-sm text-mute">{l === 1 ? 'פעולות שגרה בטוחות. רצות לבד, בלי לשאול.' : l === 2 ? 'שינויי קוד במסגרת המדיניות. כשמופעל: מתבצע בלילה, נבדק ומתועד, בלי לשאול שוב.' : 'רעיונות חדשים ושינויים אסטרטגיים. תמיד הצעה מלאה להחלטה שלך.'}</p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {items.map((p) => <PolicyRow key={p.kind} p={p} disabled={busy || !ov.approver || p.locked} onToggle={(auto) => act(() => setPolicy(p.kind, auto), auto ? 'הופעל. לא תישאלי שוב על פעולות מהסוג הזה' : 'כובה. מעכשיו זה מגיע כהצעה')} />)}
            </ul>
          </div>
        ))}
        <Panel title="מה אף פעם לא משתנה" icon="shield">
          <ol className="m-0 grid gap-1 ps-5 text-[15px]">{SAFETY.map((s) => <li key={s}>{s}</li>)}</ol>
        </Panel>
      </section>
      <aside className="grid min-w-0 content-start gap-4">
        <Panel title="מפתח אישור" icon="key">
          {ov.approver ? (
            <>
              <p className="m-0 text-good"><b>המכשיר הזה מורשה לאשר.</b></p>
              <p className="m-0 mt-1 text-sm text-mute">ההרשאות, ההחלטות והתקציב פתוחים לעריכה כאן.</p>
              <button type="button" className="btn mt-2" onClick={() => (forgetApprover(), reload())}><Icon name="logout" size={16} />הסרה מהמכשיר</button>
            </>
          ) : (
            <>
              <p className="m-0 text-sm">כתובת האתר פתוחה, ולכן החלטות והרשאות דורשות מפתח נפרד שלא נמצא בקוד. מזינים אותו פעם אחת בכל מכשיר.</p>
              <div className="mt-2 flex gap-2">
                <input className="field" type="password" autoComplete="current-password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="מפתח האישור" dir="ltr" />
                <button type="button" className="btn btn-primary shrink-0" disabled={key.trim().length < 16 || hasApprover()} onClick={save}>שמירה</button>
              </div>
            </>
          )}
        </Panel>
        <Panel title="תקציב" icon="sliders">
          <div className="grid gap-2">
            <Num label="טוקנים ביום (כל המשרד)" v={b.daily_tokens} step={50000} on={(v) => setB({ ...b, daily_tokens: v })} />
            <Num label="שיחות Claude Code בלילה" v={b.night_sessions} step={1} on={(v) => setB({ ...b, night_sessions: v })} />
            <Num label="פריסות מותרות בלילה" v={b.night_deploys} step={1} on={(v) => setB({ ...b, night_deploys: v })} />
            <Num label="פריסות שמורות לך למחר" v={b.reserve_deploys} step={1} on={(v) => setB({ ...b, reserve_deploys: v })} />
          </div>
          <p className="m-0 mt-2 text-sm text-mute">היום נוצלו <b className="num">{ov.metrics.tokens_today.toLocaleString('en-US')}</b> טוקנים. מודל קל וזול (Haiku) לסיכומים, ומודל בינוני (Sonnet) רק לסריקת החדשנות.</p>
          <button type="button" className="btn btn-primary mt-2 w-full" disabled={busy || !ov.approver} onClick={() => act(() => setBudget(b), 'התקציב נשמר')}>שמירת התקציב</button>
        </Panel>
      </aside>
    </div>
  )
}
function PolicyRow({ p, disabled, onToggle }: { p: Policy; disabled: boolean; onToggle: (auto: boolean) => void }) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-btn">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{p.label}</div>
        <div className="text-sm text-mute">{p.description}</div>
        <div className="mt-0.5 text-xs text-mute">{EXEC_TEXT[p.executor]} · חוסך כ-{p.minutes_saved} דקות בכל ריצה (הערכה)</div>
      </div>
      <button type="button" role="switch" aria-checked={p.auto} aria-label={`${p.label}: ${p.auto ? 'אוטומטי' : 'בהצעה'}`} disabled={disabled} onClick={() => onToggle(!p.auto)}
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold shadow-btn transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${p.auto ? 'bg-good text-white' : 'bg-soft text-ink'}`}>
        {p.locked ? <><Icon name="key" size={14} />{p.level === 3 ? 'תמיד שואל' : 'נעול'}</> : p.auto ? <><Icon name="check" size={14} />אוטומטי</> : 'בהצעה'}
      </button>
    </li>
  )
}
function Num({ label, v, step, on }: { label: string; v: number; step: number; on: (v: number) => void }) {
  return <label className="grid grid-cols-[1fr_120px] items-center gap-2 text-sm">{label}<input className="field num !min-h-10" type="number" min={0} step={step} value={v} onChange={(e) => on(Number(e.target.value))} dir="ltr" /></label>
}

// ---------- למידה: החלטות נקודתיות מול עקרונות קבועים ----------
function Learning({ approver }: { approver: boolean }) {
  const app = useApp()
  const [rules, setRules] = useState<Rule[] | null>(null)
  const [text, setText] = useState('')
  const [scope, setScope] = useState<Rule['scope']>('principle')
  const load = useCallback(() => listRules().then(setRules).catch(() => app.toast('הכללים לא נטענו')), [app])
  useEffect(() => { load() }, [load])
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); app.toast(ok); load() } catch (e) { app.toast(errText(e)) } }
  const groups: [string, string, (r: Rule) => boolean][] = [
    ['מחכים להחלטה שלך', 'תובנות מסגירת הערב ומתיקונים. אישור הופך אותן לכלל פעיל.', (r) => r.status === 'proposed'],
    ['עקרונות קבועים', 'משפיעים על כל הצעה ועל כל פרומפט שהמשרד כותב.', (r) => r.status === 'active' && r.scope === 'principle'],
    ['היסטוריית החלטות', 'החלטות נקודתיות. הצעה שנדחתה לא חוזרת בצורה דומה.', (r) => r.status === 'active' && r.scope === 'decision'],
  ]
  return (
    <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
      <section className="min-w-0">
        {!rules && <div className="skeleton h-40" />}
        {rules && groups.map(([title, why, f]) => {
          const list = rules.filter(f)
          return (
            <div key={title} className="mb-5">
              <h2 className="m-0 text-lg font-semibold">{title} <span className="num text-base font-normal text-mute">({list.length})</span></h2>
              <p className="m-0 mb-2 text-sm text-mute">{why}</p>
              {list.length === 0 && <Empty>אין עדיין.</Empty>}
              <ul className="m-0 grid list-none gap-2 p-0">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start gap-2 rounded-lg bg-white p-3 shadow-btn">
                    <div className="min-w-0 flex-1"><div className="break-words">{r.text}</div><div className="text-xs text-mute">{r.source ?? ''} · {dmy(r.created_at)}</div></div>
                    <div className="flex shrink-0 gap-1">
                      {r.status === 'proposed' && <button type="button" className="btn !min-h-9 !px-2 text-sm" disabled={!approver} onClick={() => run(() => ruleStatus(r.id, { status: 'active', scope: 'principle' }), 'נשמר כעיקרון קבוע')}>עיקרון קבוע</button>}
                      {r.status === 'proposed' && <button type="button" className="btn !min-h-9 !px-2 text-sm" disabled={!approver} onClick={() => run(() => ruleStatus(r.id, { status: 'active', scope: 'decision' }), 'נשמר כהחלטה נקודתית')}>החלטה נקודתית</button>}
                      {r.status === 'active' && r.scope === 'decision' && <button type="button" className="btn !min-h-9 !px-2 text-sm" disabled={!approver} onClick={() => run(() => ruleStatus(r.id, { scope: 'principle' }), 'הפך לעיקרון קבוע')}>להפוך לעיקרון</button>}
                      <button type="button" className="btn btn-danger !min-h-9 !w-9 !p-0" aria-label="העברה לארכיון" disabled={!approver} onClick={() => run(() => ruleStatus(r.id, { status: 'archived' }), 'הועבר לארכיון')}><Icon name="x" size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
      <aside className="min-w-0">
        <Panel title="כלל חדש" icon="pencil">
          <textarea className="field min-h-24" value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder="למשל: הצעה שמשנה עיצוב של אפליקציה ששודרגה ידנית לא מוצעת בכלל" />
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label="סוג">
            {(['principle', 'decision'] as const).map((s) => <button key={s} type="button" role="radio" aria-checked={scope === s} onClick={() => setScope(s)} className={`btn !min-h-9 flex-1 text-sm ${scope === s ? '!bg-navy !text-white' : ''}`}>{s === 'principle' ? 'עיקרון קבוע' : 'החלטה נקודתית'}</button>)}
          </div>
          <button type="button" className="btn btn-primary mt-2 w-full" disabled={text.trim().length < 5} onClick={() => run(() => addRule(text, scope), approver ? 'הכלל פעיל' : 'נשמר וממתין לאישור').then(() => setText(''))}>שמירה</button>
          <p className="m-0 mt-2 text-sm text-mute">כלל של כל האפליקציות (שפה, עיצוב, בנייה) שייך גם ל-Claude-GH. המשרד מזכיר אותו בכל פרומפט, אבל לא משנה את Claude-GH לבד.</p>
        </Panel>
      </aside>
    </div>
  )
}

// ---------- רכיבים קטנים ----------
function Panel({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-btn">
      <h2 className="m-0 mb-2 flex items-center gap-2 text-base font-semibold"><Icon name={icon} size={18} className="text-navy" />{title}</h2>
      <div className="grid gap-1.5">{children}</div>
    </section>
  )
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 rounded-md bg-soft p-3 text-[15px] text-mute">{children}</p>
}
function Line({ title, sub, ok, dot, href, onClick }: { title: string; sub?: string; ok?: boolean; dot?: string; href?: string; onClick?: () => void }) {
  const body = (
    <>
      {ok ? <Icon name="check" size={16} className="mt-1 shrink-0 text-good" /> : <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: dot ?? '#9AA3B2' }} />}
      <span className="min-w-0 flex-1 text-right"><span className="block break-words text-[15px] leading-snug">{title}</span>{sub && <span className="block break-words text-sm leading-snug text-mute">{sub}</span>}</span>
      {(href || onClick) && <Icon name={href ? 'external' : 'chevronL'} size={14} className="mt-1 shrink-0 text-mute" />}
    </>
  )
  const cls = 'flex w-full items-start gap-2 rounded-md p-1.5'
  if (href) return <a className={`${cls} hover:bg-soft`} href={href} target="_blank" rel="noopener">{body}</a>
  if (onClick) return <button type="button" className={`${cls} hover:bg-soft`} onClick={onClick}>{body}</button>
  return <div className={cls}>{body}</div>
}

