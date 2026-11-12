import { useEffect, useState } from 'react'
import Icon, { IconButton } from '../components/Icon'
import VoiceButton from '../components/VoiceButton'
import { useSpeech } from '../hooks/useSpeech'
import { useApp } from '../lib/ctx'
import { SLOTS } from '../lib/categories'
import { createTask } from '../lib/tasks'
import { getContacts, gmailUrl, interpret, saveContacts, whatsappUrl, type Contact, type WorkAction } from '../lib/work'
import { emptyDraft } from '../types'

const EXAMPLES = [
  'שלח מייל לאבישג ששואל לשלומה',
  'קבע תור לרופא שיניים ביום ראשון בעשר בבוקר',
  'הוסף משימה: להזמין שולחן במסעדה',
  'שלח לדנה הודעת ווצאפ שאני מאחרת בחצי שעה',
]
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// מסך עבודה: כותבים (או אומרים) מה לעשות, והמערכת מכינה את הפעולה לאישור: מייל ב-Gmail, אירוע, משימה, ווצאפ
export default function Work() {
  const app = useApp()
  const [cmd, setCmd] = useState('')
  const speech = useSpeech((t) => setCmd((v) => (v + ' ' + t).trim()))
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<{ reply: string; actions: WorkAction[] } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    getContacts().then(setContacts).catch(() => { /* אין אנשי קשר עדיין */ })
  }, [])

  const run = async () => {
    const c = cmd.trim()
    if (!c || busy) return
    speech.stop()
    setBusy(true)
    setErr(null)
    setRes(null)
    try {
      setRes(await interpret(c, SLOTS.map((s) => app.cats.names[s.key].trim()).filter(Boolean)))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setErr(msg === 'no_anthropic_key' ? 'חסר מפתח Claude בשרת.' : msg && !/^[a-z_]+$/.test(msg) ? msg : 'לא הצלחתי להבין את הבקשה. אפשר לנסח שוב.')
    } finally {
      setBusy(false)
    }
  }

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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="flex items-center gap-3 text-3xl font-light"><Icon name="spark" size={28} />מסך <b>עבודה</b></h1>
      <p className="mb-5 mt-1 text-mute">כתבי או אמרי מה לעשות. אני מכין את הפעולה, ואת מאשרת לפני שהיא יוצאת.</p>

      <textarea
        className="field resize-none text-lg"
        rows={3}
        value={cmd}
        placeholder="למשל: שלח מייל לאבישג ששואל לשלומה"
        aria-label="מה לעשות"
        onChange={(e) => setCmd(e.target.value)}
        onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && run()}
      />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <VoiceButton speech={speech} label="הקלטת בקשה" />
        <button type="button" className="btn btn-primary min-h-12 min-w-36" disabled={!cmd.trim() || busy} onClick={run}>
          <Icon name="send" size={18} />
          {busy ? 'מכין...' : 'ביצוע'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="דוגמאות">
        {EXAMPLES.map((x) => (
          <button key={x} type="button" className="rounded-lg bg-soft px-3 py-1.5 text-sm hover:bg-[#E9EBEF]" onClick={() => setCmd(x)}>{x}</button>
        ))}
      </div>

      {err && <p className="mt-5 rounded-lg bg-[#FBECEA] p-3 text-bad" role="alert">{err}</p>}
      {busy && <div className="skeleton mt-5 h-32" aria-busy="true" />}

      {res && (
        <section className="mt-6" aria-label="תוצאה">
          {res.reply && <p className="mb-3 text-lg font-semibold text-[#111111]">{res.reply}</p>}
          <div className="grid gap-4">
            {res.actions.map((a, i) => (
              <Action key={i} a={a} contacts={contacts} remember={remember} />
            ))}
          </div>
        </section>
      )}

      <Contacts contacts={contacts} onChange={persist} />
    </div>
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
    default: return <Frame icon="note" title="צריך עוד פרט"><p className="text-lg">{a.message}</p></Frame>
  }
}

function EmailCard({ a, contacts, remember }: { a: Extract<WorkAction, { type: 'email' }>; contacts: Contact[]; remember: (c: Contact) => void }) {
  const app = useApp()
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
      <label className="label" htmlFor="m-to">כתובת</label>
      <input id="m-to" dir="ltr" className={`field num text-right ${ok ? '' : 'invalid'}`} value={to} placeholder="name@gmail.com" onChange={(e) => setTo(e.target.value)} />
      {!ok && <p className="mt-1 text-sm text-bad">חסרה כתובת של {a.to_name || 'הנמען'}. מזינים פעם אחת, והיא נשמרת באנשי הקשר.</p>}
      <label className="label mt-3" htmlFor="m-su">נושא</label>
      <input id="m-su" className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <label className="label mt-3" htmlFor="m-bo">תוכן</label>
      <textarea id="m-bo" rows={6} className="field resize-y" value={body} onChange={(e) => setBody(e.target.value)} />
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
  const [phone, setPhone] = useState(a.to_phone)
  const [text, setText] = useState(a.text)
  const link = whatsappUrl(phone, text)
  return (
    <Frame icon="send" title={`הודעת ווצאפ ל${a.to_name || 'נמען'}`}>
      <label className="label" htmlFor="w-ph">טלפון</label>
      <input id="w-ph" dir="ltr" inputMode="tel" className={`field num text-right ${link ? '' : 'invalid'}`} value={phone} placeholder="050-0000000" onChange={(e) => setPhone(e.target.value)} />
      {!link && <p className="mt-1 text-sm text-bad">חסר מספר תקין של {a.to_name || 'הנמען'}. מזינים פעם אחת, והוא נשמר.</p>}
      <label className="label mt-3" htmlFor="w-tx">ההודעה</label>
      <textarea id="w-tx" rows={3} className="field resize-y" value={text} onChange={(e) => setText(e.target.value)} />
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

// אנשי קשר שמורים: משמשים להשלמת כתובות ומספרים אוטומטית
function Contacts({ contacts, onChange }: { contacts: Contact[]; onChange: (c: Contact[]) => void }) {
  const [c, setC] = useState<Contact>({ name: '', email: '', phone: '' })
  const add = () => {
    if (!c.name.trim()) return
    onChange([...contacts.filter((x) => x.name !== c.name.trim()), { ...c, name: c.name.trim() }])
    setC({ name: '', email: '', phone: '' })
  }
  return (
    <section className="mt-10" aria-label="אנשי קשר שמורים">
      <h2 className="mb-1 flex items-center gap-2 text-xl font-light"><Icon name="users" size={20} />אנשי קשר שמורים</h2>
      <p className="mb-3 text-sm text-mute">כתובת או טלפון שמורים מתמלאים לבד בפעם הבאה.</p>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {contacts.map((x) => (
          <li key={x.name} className="flex items-center gap-3 rounded-lg bg-soft/70 px-3 py-2">
            <span className="min-w-0 flex-1 break-words"><b>{x.name}</b> <span className="num text-sm text-mute">{[x.email, x.phone].filter(Boolean).join(' · ')}</span></span>
            <IconButton name="x" label={`מחיקת ${x.name}`} tone="danger" size={16} className="!h-8 !w-8" onClick={() => onChange(contacts.filter((y) => y.name !== x.name))} />
          </li>
        ))}
        {contacts.length === 0 && <li className="text-sm text-mute">עוד אין אנשי קשר. הם יישמרו לבד כשתפתחי מייל או ווצאפ.</li>}
      </ul>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto]">
        <input className="field" placeholder="שם" aria-label="שם" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <input className="field num" dir="ltr" placeholder="מייל" aria-label="מייל" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
        <input className="field num" dir="ltr" placeholder="טלפון" aria-label="טלפון" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
        <IconButton name="plus" label="הוספת איש קשר" tone="primary" size={20} className="!h-11 !w-11" disabled={!c.name.trim()} onClick={add} />
      </div>
    </section>
  )
}
