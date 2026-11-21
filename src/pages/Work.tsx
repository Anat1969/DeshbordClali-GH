import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon, { IconButton } from '../components/Icon'
import { useSpeech } from '../hooks/useSpeech'
import { useApp } from '../lib/ctx'
import { SLOTS } from '../lib/categories'
import { createTask } from '../lib/tasks'
import { getContacts, gmailUrl, interpret, saveContacts, whatsappUrl, type Contact, type Turn, type WorkAction } from '../lib/work'
import { extractMany } from '../lib/claude'
import { GUIDE } from '../lib/guide'
import { emptyDraft, type EventDraft } from '../types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// הודעה בשיחה: של ענת, או של הבוט (טקסט, שאלה עם תשובות מוצעות, פעולות לאישור, או אירועים שנקראו מתמונה)
type ShotState = { url: string; busy: boolean; drafts: EventDraft[] }
type Msg =
  | { id: number; role: 'me'; text: string; image?: string }
  | { id: number; role: 'bot'; text: string; actions?: WorkAction[]; options?: string[]; shot?: ShotState; error?: boolean; hello?: boolean }

const HELLO: Msg = { id: 0, role: 'bot', hello: true, text: 'שלום ענת.\nכתבי או אמרי מה לעשות, ואני מכין את הפעולה.\nשום דבר לא יוצא בלי אישור שלך.' }
// השיחה נשמרת בזמן מעבר בין מסכים, עד רענון הדף או "שיחה חדשה"
let kept: Msg[] = [HELLO]
let seq = 1
const EXAMPLES = GUIDE['/work'].items.filter((i) => i.ask).slice(0, 5)

const isAsk = (m: Msg | undefined) => !!m && m.role === 'bot' && !m.error && (m.actions ?? []).some((a) => a.type === 'none')
// מה נשלח לשרת כהקשר: הטקסט של כל תור, וסיכום קצר של מה שהבוט הכין
const toTurn = (m: Msg): Turn => {
  if (m.role === 'me') return { role: 'me', text: m.text || '(תמונה)' }
  const made = (m.actions ?? []).filter((a) => a.type !== 'none').map((a) => (a.type === 'email' ? `מייל ל${a.to_name}` : a.type === 'whatsapp' ? `ווצאפ ל${a.to_name}` : a.type === 'event' ? `אירוע: ${a.title} ב-${a.event_date}` : a.type === 'task' ? `משימה: ${a.text}` : a.type === 'contact' ? `איש קשר: ${a.name}` : ''))
  return { role: 'bot', text: [m.text, made.length ? `[הכנתי: ${made.join('; ')}]` : ''].filter(Boolean).join(' ') }
}

// שיחה: דיאלוג עם הבוט. ההודעות למעלה, ותיבת הכתיבה קבועה בתחתית, תמיד באותו מקום
export default function Work() {
  const app = useApp()
  const loc = useLocation()
  const [msgs, setMsgsState] = useState<Msg[]>(kept)
  const setMsgs = (fn: (l: Msg[]) => Msg[]) => setMsgsState((l) => (kept = fn(l)))
  const [cmd, setCmd] = useState('')
  const speech = useSpeech((t) => setCmd((v) => (v + ' ' + t).trim()))
  const [busy, setBusy] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const picker = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getContacts().then(setContacts).catch(() => { /* אין אנשי קשר עדיין */ })
  }, [])

  // בקשה מוכנה שהגיעה ממסך אחר (מ"מה אפשר כאן" או מאנשי הקשר) נכנסת לתיבה, לעריכה לפני שליחה
  useEffect(() => {
    const ask = (loc.state as { ask?: string } | null)?.ask
    if (ask !== undefined) { setCmd(ask); box.current?.focus() }
  }, [loc.key, loc.state])

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy])
  // התיבה גדלה עם הטקסט, עד חמש שורות
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`
  }, [cmd])

  const last = msgs[msgs.length - 1]
  const asking = !busy && isAsk(last)

  const send = async (text: string) => {
    const c = text.trim()
    if (!c || busy) return
    speech.stop()
    const history = msgs.filter((m) => !('hello' in m && m.hello) && !(m.role === 'bot' && (m.error || m.shot))).slice(-8).map(toTurn)
    setMsgs((l) => [...l, { id: seq++, role: 'me', text: c }])
    setCmd('')
    setBusy(true)
    try {
      const r = await interpret(c, SLOTS.map((s) => app.cats.names[s.key].trim()).filter(Boolean), history)
      const q = r.actions.filter((a) => a.type === 'none').map((a) => (a.type === 'none' ? a.message : ''))
      // שאלה של הבוט היא הטקסט של הבועה. אם יש גם פעולות, המשפט הפותח נשאר מעליה
      const text = [r.actions.length > q.length || !q.length ? r.reply : '', ...q].filter(Boolean).join('\n')
      setMsgs((l) => [...l, { id: seq++, role: 'bot', text, actions: r.actions, options: q.length ? r.options : [] }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setMsgs((l) => [...l, { id: seq++, role: 'bot', error: true, text: msg === 'no_anthropic_key' ? 'חסר מפתח Claude בשרת.' : msg && !/^[a-z_]+$/.test(msg) ? msg : 'לא הצלחתי להבין את הבקשה.\nאפשר לנסח שוב, כאן למטה.' }])
    } finally {
      setBusy(false)
      box.current?.focus()
    }
  }

  // תמונה שהודבקה, נגררה או נבחרה: קוראים ממנה את כל האירועים ומציגים לאישור
  const readShot = async (file: File) => {
    if (!file.type.startsWith('image/')) return app.toast('צריך תמונה: PNG, JPG או WEBP')
    const url = URL.createObjectURL(file)
    const id = seq++
    setMsgs((l) => [...l, { id: seq++, role: 'me', text: '', image: url }, { id, role: 'bot', text: '', shot: { url, busy: true, drafts: [] } }])
    const set = (p: Partial<Msg>) => setMsgs((l) => l.map((m) => (m.id === id ? ({ ...m, ...p } as Msg) : m)))
    try {
      const drafts = await extractMany(file, app.cats.names)
      set(drafts.length ? { shot: { url, busy: false, drafts } } : { shot: undefined, error: true, text: 'לא מצאתי אירועים בתמונה.\nאפשר לנסות תמונה חדה יותר.' })
    } catch (e) {
      set({ shot: undefined, error: true, text: e instanceof Error ? e.message : 'קריאת התמונה נכשלה' })
    }
  }
  const imageOf = (files?: FileList | null) => Array.from(files ?? []).find((f) => f.type.startsWith('image/'))

  const persist = async (next: Contact[]) => {
    setContacts(next)
    try { await saveContacts(next) } catch { app.toast('שמירת איש הקשר נכשלה') }
  }
  // שומר או מעדכן איש קשר לפי שם
  const remember = (c: Contact) => {
    if (!c.name.trim()) return
    const i = contacts.findIndex((x) => x.name === c.name)
    persist(i < 0 ? [...contacts, c] : contacts.map((x, k) => (k === i ? { ...x, ...Object.fromEntries(Object.entries(c).filter(([, v]) => v)) } : x)))
  }

  const fresh = () => { kept = [HELLO]; setMsgsState(kept); setCmd(''); box.current?.focus() }

  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-3 sm:px-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const f = imageOf(e.dataTransfer.files)
        if (f) { e.preventDefault(); readShot(f) }
      }}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 py-3">
        <h1 className="m-0 flex items-center gap-2.5 text-2xl font-light"><Icon name="spark" size={24} />שיחה <b>עם הבוט</b></h1>
        <div className="flex gap-2">
          <Link to="/contacts" className="btn !min-h-9 gap-1.5 text-sm"><Icon name="users" size={16} />אנשי קשר <span className="num text-mute">{contacts.length || ''}</span></Link>
          {msgs.length > 1 && <button type="button" className="btn !min-h-9 gap-1.5 text-sm" onClick={fresh}><Icon name="plus" size={16} />שיחה חדשה</button>}
        </div>
      </div>

      {/* ההודעות: הבוט מימין עם סמל, ענת משמאל בכחול */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-[#F7F8FA] px-3 py-4 sm:px-5" role="log" aria-live="polite" aria-label="השיחה">
        <ol className="m-0 grid list-none gap-4 p-0">
          {msgs.map((m, i) => m.role === 'me' ? (
            <li key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-navy px-4 py-2.5 text-lg text-white shadow-btn">
                {m.image && <img src={m.image} alt="התמונה שנשלחה" className="max-h-40 rounded-lg" />}
                {m.text && <p className="m-0 whitespace-pre-wrap break-words">{m.text}</p>}
              </div>
            </li>
          ) : (
            <li key={m.id} className="flex items-start gap-2.5">
              <BotFace />
              <div className="min-w-0 max-w-[88%] flex-1 sm:flex-none sm:basis-auto">
                {m.text && (
                  <div className={`inline-block max-w-full rounded-2xl rounded-tr-sm px-4 py-2.5 text-lg shadow-btn ${m.error ? 'bg-[#FBECEA] text-bad' : 'bg-white'}`}>
                    {isAsk(m) && <p className="m-0 mb-1 text-sm font-semibold text-[#B85F0B]">שאלה אליך</p>}
                    <p className="m-0 whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                )}
                {m.hello && (
                  <div className="mt-2.5">
                    <p className="m-0 mb-1.5 text-sm text-mute">דוגמאות. לחיצה מעתיקה לתיבה שלמטה, ואפשר לשנות לפני השליחה:</p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLES.map((x) => (
                        <button key={x.t} type="button" className="btn !h-auto !min-h-9 !justify-start !py-1.5 text-right text-[15px]" title={x.ask} onClick={() => { setCmd(x.ask!); box.current?.focus() }}>{x.t}</button>
                      ))}
                    </div>
                  </div>
                )}
                {m.shot && <Shot shot={m.shot} />}
                {(m.actions ?? []).some((a) => a.type !== 'none') && (
                  <div className="mt-2.5 grid w-full gap-3 sm:w-[560px] sm:max-w-full">
                    {m.actions!.filter((a) => a.type !== 'none').map((a, k) => <Action key={k} a={a} contacts={contacts} remember={remember} />)}
                  </div>
                )}
                {/* תשובות מוצעות לשאלה האחרונה: לחיצה שולחת */}
                {i === msgs.length - 1 && asking && (m.options ?? []).length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="תשובות מוצעות">
                    {m.options!.map((o) => <button key={o} type="button" className="btn btn-primary !min-h-10" onClick={() => send(o)}>{o}</button>)}
                  </div>
                )}
              </div>
            </li>
          ))}
          {busy && (
            <li className="flex items-start gap-2.5" aria-label="הבוט כותב">
              <BotFace />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tr-sm bg-white px-4 py-4 shadow-btn">
                {[0, 1, 2].map((d) => <span key={d} className="typing-dot h-2 w-2 rounded-full bg-mute" style={{ animationDelay: `${d * 160}ms` }} />)}
              </div>
            </li>
          )}
        </ol>
        <div ref={end} />
      </div>

      {/* תיבת הכתיבה: קבועה בתחתית. כשהבוט שואל, היא מסומנת ואומרת שכאן עונים */}
      <div className="shrink-0 pb-3 pt-2.5">
        {asking && (
          <p className="m-0 mb-1.5 flex items-center gap-1.5 font-semibold text-[#B85F0B]" role="status">
            <Icon name="chevronD" size={16} />
            הבוט מחכה לתשובה שלך. כותבים אותה כאן:
          </p>
        )}
        <div className={`flex items-end gap-2 rounded-xl bg-white p-2 transition-shadow ${asking ? 'shadow-[0_0_0_3px_#F0B26B,0_2px_8px_rgba(26,43,74,.08)]' : 'shadow-[0_0_0_2px_#1A2B4A,0_2px_8px_rgba(26,43,74,.08)]'}`}>
          <textarea
            ref={box}
            rows={1}
            autoFocus
            className="min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-lg text-ink outline-none placeholder:text-mute"
            value={cmd}
            placeholder={asking ? 'התשובה שלך...' : msgs.length > 1 ? 'מה עוד לעשות?' : 'מה לעשות?'}
            aria-label={asking ? 'התשובה שלך לבוט' : 'הודעה לבוט'}
            onChange={(e) => setCmd(e.target.value)}
            onPaste={(e) => {
              const f = imageOf(e.clipboardData.files)
              if (f) { e.preventDefault(); readShot(f) }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(cmd) }
            }}
          />
          {speech.supported && (
            <IconButton name={speech.listening ? 'stop' : 'mic'} label={speech.listening ? 'עצירת הקלטה' : 'הקלטה ותמלול'} tone={speech.listening ? 'danger' : 'plain'} size={20} className={`!h-11 !w-11 ${speech.listening ? 'bg-[#FBECEA]' : 'bg-soft'}`} onClick={speech.toggle} />
          )}
          <IconButton name="upload" label="צירוף תמונה, למשל צילום מסך של יומן" size={20} className="!h-11 !w-11 bg-soft" onClick={() => picker.current?.click()} />
          <input ref={picker} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readShot(f); e.target.value = '' }} />
          <button type="button" className="btn btn-primary !min-h-11 shrink-0 !px-4" disabled={!cmd.trim() || busy} onClick={() => send(cmd)}>
            <Icon name="send" size={18} />
            <span className="hidden sm:inline">{busy ? 'מכין...' : 'שליחה'}</span>
          </button>
        </div>
        <p className="m-0 mt-1.5 text-sm text-mute">
          {speech.listening ? <span className="text-bad">מקליטה, דברי עכשיו. {speech.interim}</span> : speech.error ? <span className="text-bad">{speech.error}</span> : <>Enter שולח. Shift+Enter יורד שורה. אפשר להדביק או לגרור לכאן תמונה.</>}
        </p>
      </div>
    </div>
  )
}

// הסמל של הבוט: ריבוע כחול עם ניצוץ, ליד כל הודעה שלו
function BotFace() {
  return <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white" aria-label="הבוט"><Icon name="spark" size={18} /></span>
}

// תוצאת קריאת תמונה: כל אירוע בכרטיס משלו, עם הוספה בודדת או הוספת הכול ליומן
function Shot({ shot }: { shot: ShotState }) {
  const app = useApp()
  const [items, setItems] = useState<EventDraft[]>([])
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [failed, setFailed] = useState(false)
  useEffect(() => { setItems(shot.drafts); setAdded(new Set()) }, [shot.drafts])

  const patch = (i: number, p: Partial<EventDraft>) => setItems((l) => l.map((d, k) => (k === i ? { ...d, ...p } : d)))
  const ready = (d: EventDraft) => !!d.event_date && !!d.title.trim()
  const addOne = async (i: number) => {
    try {
      await app.ev.add(items[i])
      setAdded((s) => new Set(s).add(i))
      return true
    } catch {
      setFailed(true)
      return false
    }
  }
  const addAll = async () => {
    setFailed(false)
    let n = 0
    for (let i = 0; i < items.length; i++) if (!added.has(i) && ready(items[i]) && !inCal(items[i]) && (await addOne(i))) n++
    if (n) app.toast(n === 1 ? 'אירוע אחד נוסף ליומן' : `${n} אירועים נוספו ליומן`)
  }
  // אירוע שכבר ביומן: אותו תאריך, אותה שעה ותחילת שם זהה
  const norm = (t: string) => t.replace(/\s+/g, ' ').trim().slice(0, 12)
  const inCal = (d: EventDraft) => app.ev.events.some((e) => e.event_date === d.event_date && (e.event_time ?? '').slice(0, 5) === (d.event_time ?? '') && norm(e.title) === norm(d.title))
  const pending = items.filter((d, i) => !added.has(i) && ready(d) && !inCal(d)).length

  return (
    <section className="w-full sm:w-[560px] sm:max-w-full" aria-label="אירועים מהתמונה">
      <Frame icon="calendar" title="אירועים שנקראו מהתמונה">
        <div className="flex items-start gap-3">
          <img src={shot.url} alt="התמונה שהודבקה" className="h-20 w-28 shrink-0 rounded-lg bg-soft object-cover" />
          <p className="min-w-0 flex-1 text-lg font-semibold">
            {shot.busy ? 'קורא את התמונה...' : items.length ? `נמצאו ${items.length} אירועים. בדקי ואשרי לפני ההוספה.` : 'לא נמצאו אירועים'}
          </p>
        </div>
        {shot.busy && <div className="skeleton mt-4 h-24" aria-busy="true" />}
        <ul className="m-0 mt-4 grid list-none gap-3 p-0">
          {items.map((d, i) => (
            <li key={i} className={`rounded-lg bg-soft/70 p-3 ${added.has(i) || inCal(d) ? 'opacity-60' : ''}`}>
              <input className="field font-semibold" value={d.title} aria-label="נושא" disabled={added.has(i)} onChange={(e) => patch(i, { title: e.target.value })} />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input type="date" className={`field num ${d.event_date ? '' : 'invalid'}`} value={d.event_date ?? ''} aria-label="תאריך" disabled={added.has(i)} onChange={(e) => patch(i, { event_date: e.target.value || null })} />
                <input type="time" className="field num" value={d.event_time ?? ''} aria-label="שעה" disabled={added.has(i)} onChange={(e) => patch(i, { event_time: e.target.value || null })} />
              </div>
              {!d.event_date && <p className="mt-1 text-sm text-bad">לא זיהיתי תאריך. בחרי תאריך כדי להוסיף.</p>}
              {d.location && <p className="mt-2 text-sm text-mute">{d.location}</p>}
              <button type="button" className="btn mt-2" disabled={added.has(i) || inCal(d) || !ready(d)} onClick={() => addOne(i).then((ok) => ok && app.toast('נוסף ליומן'))}>
                <Icon name={added.has(i) || inCal(d) ? 'check' : 'plus'} size={16} />
                {added.has(i) ? 'נוסף' : inCal(d) ? 'כבר ביומן' : 'הוספה ליומן'}
              </button>
            </li>
          ))}
        </ul>
        {failed && <p className="mt-3 text-sm text-bad" role="alert">חלק מההוספות נכשלו. אפשר לנסות שוב.</p>}
        {pending > 1 && (
          <button type="button" className="btn btn-primary mt-4" onClick={addAll}>
            <Icon name="plus" size={16} />
            הוספת כל {pending} האירועים ליומן
          </button>
        )}
      </Frame>
    </section>
  )
}

function Frame({ icon, title, children }: { icon: Parameters<typeof Icon>[0]['name']; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-lg bg-white p-4 shadow-btn" style={{ borderTop: '4px solid #1A2B4A' }}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy"><Icon name={icon} size={18} />{title}</h2>
      {children}
    </article>
  )
}

function Action({ a, contacts, remember }: { a: WorkAction; contacts: Contact[]; remember: (c: Contact) => void }) {
  switch (a.type) {
    case 'email': return <EmailCard a={a} contacts={contacts} remember={remember} />
    case 'event': return <EventAction a={a} />
    case 'task': return <TaskAction a={a} />
    case 'whatsapp': return <WhatsappCard a={a} remember={remember} />
    case 'contact': return <ContactAction a={a} contacts={contacts} remember={remember} />
    default: return null
  }
}

function EmailCard({ a, contacts, remember }: { a: Extract<WorkAction, { type: 'email' }>; contacts: Contact[]; remember: (c: Contact) => void }) {
  const app = useApp()
  const id = useId()
  // כתובת שמורה באנשי הקשר מתמלאת לבד
  const known = contacts.find((c) => c.name && a.to_name && (c.name.includes(a.to_name) || a.to_name.includes(c.name)))?.email ?? ''
  const [to, setTo] = useState(a.to_email || known)
  const [subject, setSubject] = useState(a.subject)
  const [body, setBody] = useState(a.body)
  const ok = EMAIL.test(to.trim())

  const open = () => {
    window.open(gmailUrl(to.trim(), subject, body), '_blank', 'noopener')
    remember({ name: a.to_name, email: to.trim(), phone: '' })
  }
  return (
    <Frame icon="mail" title={`מייל ל${a.to_name || 'נמען'}`}>
      <label className="label" htmlFor={`${id}-to`}>כתובת</label>
      <input id={`${id}-to`} dir="ltr" className={`field num text-right ${ok ? '' : 'invalid'}`} value={to} placeholder="name@gmail.com" onChange={(e) => setTo(e.target.value)} />
      {!ok && <p className="mt-1 text-sm text-bad">חסרה כתובת של {a.to_name || 'הנמען'}. מזינים פעם אחת, והיא נשמרת באנשי הקשר.</p>}
      <label className="label mt-3" htmlFor={`${id}-su`}>נושא</label>
      <input id={`${id}-su`} className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <label className="label mt-3" htmlFor={`${id}-bo`}>תוכן</label>
      <textarea id={`${id}-bo`} rows={6} className="field resize-y" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={!ok} onClick={open}>
          <Icon name="mail" size={16} />
          פתיחה ב-Gmail
          <Icon name="external" size={14} />
        </button>
        <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(`${subject}\n\n${body}`).then(() => app.toast('הטקסט הועתק'))}>
          <Icon name="copy" size={16} />
          העתקה
        </button>
      </div>
      <p className="mt-2 text-sm text-mute">נפתח חלון כתיבה ב-Gmail עם הכול מוכן. השליחה בלחיצה שלך.</p>
    </Frame>
  )
}

function EventAction({ a }: { a: Extract<WorkAction, { type: 'event' }> }) {
  const app = useApp()
  const slot = SLOTS.find((s) => app.cats.names[s.key].trim() && app.cats.names[s.key].trim() === a.category_name)
  return (
    <Frame icon="calendar" title="אירוע חדש">
      <p className="break-words text-xl font-semibold text-[#111111]">{a.title}</p>
      <p className="mt-1 text-lg">{a.event_date}{a.event_time ? ` בשעה ${a.event_time}` : ''}{a.location ? `, ${a.location}` : ''}</p>
      {a.people.length > 0 && <p className="mt-1 text-mute">עם {a.people.join(', ')}</p>}
      <button
        type="button"
        className="btn btn-primary mt-4"
        onClick={() => app.reviewDraft({ ...emptyDraft(), title: a.title, event_date: a.event_date, event_time: a.event_time, location: a.location, people: a.people, description: a.description, category: slot?.key ?? null })}
      >
        <Icon name="plus" size={16} />
        בדיקה והוספה ליומן
      </button>
    </Frame>
  )
}

function TaskAction({ a }: { a: Extract<WorkAction, { type: 'task' }> }) {
  const app = useApp()
  const [text, setText] = useState(a.text)
  const [done, setDone] = useState(false)
  return (
    <Frame icon="check" title="משימה חדשה">
      <input className="field font-semibold" value={text} aria-label="המשימה" onChange={(e) => setText(e.target.value)} disabled={done} />
      <button
        type="button"
        className="btn btn-primary mt-4"
        disabled={done || !text.trim()}
        onClick={async () => {
          try {
            await createTask(text.trim())
            setDone(true)
            app.toast('נוספה למשימות')
          } catch {
            app.toast('ההוספה נכשלה')
          }
        }}
      >
        <Icon name={done ? 'check' : 'plus'} size={16} />
        {done ? 'נוספה' : 'הוספה למשימות'}
      </button>
    </Frame>
  )
}

function WhatsappCard({ a, remember }: { a: Extract<WorkAction, { type: 'whatsapp' }>; remember: (c: Contact) => void }) {
  const id = useId()
  const [phone, setPhone] = useState(a.to_phone)
  const [text, setText] = useState(a.text)
  const link = whatsappUrl(phone, text)
  return (
    <Frame icon="send" title={`הודעת ווצאפ ל${a.to_name || 'נמען'}`}>
      <label className="label" htmlFor={`${id}-ph`}>טלפון</label>
      <input id={`${id}-ph`} dir="ltr" inputMode="tel" className={`field num text-right ${link ? '' : 'invalid'}`} value={phone} placeholder="050-0000000" onChange={(e) => setPhone(e.target.value)} />
      {!link && <p className="mt-1 text-sm text-bad">חסר מספר תקין של {a.to_name || 'הנמען'}. מזינים פעם אחת, והוא נשמר.</p>}
      <label className="label mt-3" htmlFor={`${id}-tx`}>ההודעה</label>
      <textarea id={`${id}-tx`} rows={3} className="field resize-y" value={text} onChange={(e) => setText(e.target.value)} />
      <button
        type="button"
        className="btn btn-primary mt-4"
        disabled={!link}
        onClick={() => {
          if (link) window.open(link, '_blank', 'noopener')
          remember({ name: a.to_name, email: '', phone })
        }}
      >
        <Icon name="send" size={16} />
        פתיחה בווצאפ
        <Icon name="external" size={14} />
      </button>
    </Frame>
  )
}

// איש קשר שהבוט הציע לשמור: שם, מייל וטלפון לעריכה, ושמירה בלחיצה
function ContactAction({ a, contacts, remember }: { a: Extract<WorkAction, { type: 'contact' }>; contacts: Contact[]; remember: (c: Contact) => void }) {
  const app = useApp()
  const [c, setC] = useState<Contact>({ name: a.name, email: a.email, phone: a.phone })
  const [done, setDone] = useState(false)
  const exists = contacts.some((x) => x.name === c.name.trim())
  const ok = !!c.name.trim() && (!c.email.trim() || EMAIL.test(c.email.trim()))
  return (
    <Frame icon="users" title="איש קשר לשמירה">
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="field font-semibold" aria-label="שם" placeholder="שם" value={c.name} disabled={done} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <input className={`field num ${ok ? '' : 'invalid'}`} dir="ltr" aria-label="מייל" placeholder="מייל" value={c.email} disabled={done} onChange={(e) => setC({ ...c, email: e.target.value })} />
        <input className="field num" dir="ltr" aria-label="טלפון" placeholder="טלפון" value={c.phone} disabled={done} onChange={(e) => setC({ ...c, phone: e.target.value })} />
      </div>
      <button type="button" className="btn btn-primary mt-4" disabled={done || !ok} onClick={() => { remember({ name: c.name.trim(), email: c.email.trim(), phone: c.phone.trim() }); setDone(true); app.toast('נשמר באנשי הקשר') }}>
        <Icon name={done ? 'check' : 'plus'} size={16} />
        {done ? 'נשמר' : exists ? 'עדכון איש הקשר' : 'שמירה באנשי הקשר'}
      </button>
    </Frame>
  )
}
