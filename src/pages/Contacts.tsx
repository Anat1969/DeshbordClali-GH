import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { IconButton } from '../components/Icon'
import { useApp } from '../lib/ctx'
import { getContacts, gmailUrl, mergeContacts, parseContacts, saveContacts, whatsappUrl, type Contact } from '../lib/work'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY: Contact = { name: '', email: '', phone: '' }

// אנשי קשר: הרשימה שממנה מתמלאות כתובות במייל, בווצאפ ובפרויקטים. חיפוש, פעולה ישירה, עריכה, והדבקה של רשימה שלמה
export default function Contacts() {
  const app = useApp()
  const nav = useNavigate()
  const [list, setList] = useState<Contact[] | null>(null)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState<Contact>(EMPTY)
  const [edit, setEdit] = useState<{ name: string; c: Contact } | null>(null)
  const [del, setDel] = useState<string | null>(null)
  const [bulk, setBulk] = useState<string | null>(null)

  const load = () => getContacts().then((l) => { setList(l); setError(false) }).catch(() => setError(true))
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!del) return
    const t = window.setTimeout(() => setDel(null), 3000)
    return () => window.clearTimeout(t)
  }, [del])

  // פרויקטים שבהם האדם הוא איש הקשר
  const inProjects = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const p of app.projects.projects) if (p.contact_name) m.set(p.contact_name, [...(m.get(p.contact_name) ?? []), p.name])
    return m
  }, [app.projects.projects])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return [...(list ?? [])]
      .filter((c) => !t || c.name.toLowerCase().includes(t) || c.email.toLowerCase().includes(t) || c.phone.includes(t))
      .sort((a, b) => a.name.localeCompare(b.name, 'he'))
  }, [list, q])

  const persist = async (next: Contact[], ok: string) => {
    const prev = list
    setList(next)
    try { await saveContacts(next); app.toast(ok) } catch { setList(prev); app.toast('השמירה נכשלה, השינוי בוטל') }
  }
  const valid = (c: Contact) => !!c.name.trim() && (!c.email.trim() || EMAIL.test(c.email.trim()))
  const clean = (c: Contact): Contact => ({ name: c.name.trim(), email: c.email.trim().toLowerCase(), phone: c.phone.trim() })

  const add = () => {
    if (!list || !valid(draft)) return
    const c = clean(draft)
    persist([...list.filter((x) => x.name !== c.name), c], 'נשמר')
    setDraft(EMPTY)
  }
  const saveEdit = () => {
    if (!list || !edit || !valid(edit.c)) return
    persist(list.map((x) => (x.name === edit.name ? clean(edit.c) : x)), 'נשמר')
    setEdit(null)
  }

  const parsed = bulk ? parseContacts(bulk) : []
  const fresh = parsed.filter((c) => !(list ?? []).some((x) => (c.email ? x.email.toLowerCase() === c.email : x.name === c.name)))
  const importBulk = async () => {
    try {
      const r = await mergeContacts(parsed)
      app.toast(r.added ? `נוספו ${r.added} אנשי קשר` : 'כולם כבר ברשימה')
      setBulk(null)
      load()
    } catch { app.toast('ההוספה נכשלה') }
  }

  const withMail = (list ?? []).filter((c) => c.email).length
  const withPhone = (list ?? []).filter((c) => c.phone).length

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="m-0 flex items-center gap-3 text-3xl font-light"><Icon name="users" size={28} />אנשי <b>קשר</b></h1>
      <p className="mb-5 mt-1 text-mute">
        {list ? <><b className="num text-ink">{list.length}</b> שמורים: <span className="num">{withMail}</span> עם מייל, <span className="num">{withPhone}</span> עם טלפון.</> : '...'}
        <br />
        כתובת שנשמרה פעם אחת מתמלאת לבד בשיחה, במייל, בווצאפ ובפרויקטים.
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <input className="field !pe-10 text-lg" placeholder="חיפוש לפי שם, כתובת או טלפון" aria-label="חיפוש באנשי הקשר" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <IconButton name="x" label="ניקוי החיפוש" size={16} className="absolute end-1 top-1" onClick={() => setQ('')} />}
        </div>
        <button type="button" className={`btn ${bulk !== null ? 'btn-primary' : ''}`} aria-expanded={bulk !== null} onClick={() => setBulk(bulk === null ? '' : null)}>
          <Icon name="text" size={18} />הדבקת רשימה
        </button>
      </div>

      {bulk !== null && (
        <section className="mt-3 rounded-lg bg-soft/70 p-4" aria-label="הדבקת רשימה">
          <p className="m-0 mb-2 text-[15px]">
            מדביקים רשימה מכל מקום: שורה לכל אדם, עם שם וכתובת, ואפשר גם טלפון.
            <br />
            <span className="text-mute">רק מי שחסר מתווסף. מי שכבר ברשימה לא משתנה ולא נמחק.</span>
          </p>
          <textarea autoFocus rows={5} dir="auto" className="field resize-y !bg-white" aria-label="הרשימה להדבקה" placeholder={'דנה כהן <dana@example.com>\nיוסי לוי, yossi@example.com, 050-1234567'} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          {parsed.length > 0 && (
            <p className="m-0 mt-2 text-[15px]">
              זוהו <b className="num">{parsed.length}</b>, מתוכם <b className="num text-good">{fresh.length}</b> חדשים{fresh.length > 0 && <>: {fresh.slice(0, 6).map((c) => c.name).join(', ')}{fresh.length > 6 ? ' ועוד' : ''}</>}.
            </p>
          )}
          <button type="button" className="btn btn-primary mt-3" disabled={fresh.length === 0} onClick={importBulk}>
            <Icon name="plus" size={16} />{fresh.length ? `הוספת ${fresh.length} לאנשי הקשר` : 'אין חדשים להוספה'}
          </button>
        </section>
      )}

      {/* הוספה של אדם אחד */}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr_auto]">
        <input className="field" placeholder="שם חדש" aria-label="שם" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input className={`field num ${!draft.email.trim() || EMAIL.test(draft.email.trim()) ? '' : 'invalid'}`} dir="ltr" placeholder="מייל" aria-label="מייל" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input className="field num" dir="ltr" placeholder="טלפון: 050-1234567" aria-label="טלפון" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <IconButton name="plus" label="הוספת איש קשר" tone="primary" size={20} className="!h-11 !w-11" disabled={!valid(draft)} onClick={add} />
      </div>

      {error && <p className="mt-4 text-bad" role="alert">הטעינה נכשלה. <button type="button" className="underline underline-offset-4" onClick={load}>ניסיון חוזר</button></p>}
      {!list && !error && <div className="skeleton mt-5 h-40" aria-busy="true" />}

      {list && (
        <>
          <p className="m-0 mb-2 mt-6 text-sm text-mute">
            {q.trim() ? <>נמצאו <span className="num">{shown.length}</span> מתוך <span className="num">{list.length}</span></> : 'מסודר לפי שם'}
          </p>
          {shown.length === 0 && (
            <p className="rounded-lg bg-soft p-4 text-mute">
              {list.length === 0 ? 'עוד אין אנשי קשר. מוסיפים אחד למעלה, מדביקים רשימה, או פותחים מייל בשיחה והכתובת נשמרת לבד.' : 'אין התאמה לחיפוש.'}
            </p>
          )}
          <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((c) => {
              const wa = c.phone ? whatsappUrl(c.phone, '') : null
              const projs = inProjects.get(c.name) ?? []
              return edit?.name === c.name ? (
                <li key={c.name} className="rounded-lg bg-white p-3 shadow-[0_0_0_2px_#1A2B4A]">
                  <div className="grid gap-2">
                    <input autoFocus className="field font-semibold" aria-label="שם" value={edit.c.name} onChange={(e) => setEdit({ ...edit, c: { ...edit.c, name: e.target.value } })} />
                    <input className={`field num ${valid(edit.c) ? '' : 'invalid'}`} dir="ltr" aria-label="מייל" placeholder="מייל" value={edit.c.email} onChange={(e) => setEdit({ ...edit, c: { ...edit.c, email: e.target.value } })} />
                    <input className="field num" dir="ltr" aria-label="טלפון" placeholder="טלפון" value={edit.c.phone} onChange={(e) => setEdit({ ...edit, c: { ...edit.c, phone: e.target.value } })} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn btn-primary !min-h-10" disabled={!valid(edit.c)} onClick={saveEdit}><Icon name="check" size={16} />שמירה</button>
                    <button type="button" className="btn !min-h-10" onClick={() => setEdit(null)}>ביטול</button>
                  </div>
                </li>
              ) : (
                <li key={c.name} className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-btn">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E8ECF4] text-xl font-semibold text-navy" aria-hidden="true">{c.name.slice(0, 1)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 break-words text-xl font-semibold text-[#111111]">{c.name}</p>
                      <p className="num m-0 break-all text-[15px] text-mute" dir="ltr" style={{ textAlign: 'right' }}>{[c.email.toLowerCase(), c.phone].filter(Boolean).join('  ·  ') || 'אין כתובת או טלפון'}</p>
                      {projs.length > 0 && <p className="m-0 mt-0.5 text-sm text-navy">איש קשר בפרויקט: {projs.join(', ')}</p>}
                    </div>
                    <IconButton name="pencil" label={`עריכת ${c.name}`} size={16} onClick={() => setEdit({ name: c.name, c })} />
                    <IconButton name="x" label={del === c.name ? 'לחיצה נוספת מוחקת' : `מחיקת ${c.name}`} tone="danger" size={16} className={del === c.name ? '!bg-bad !text-white' : ''} onClick={() => (del === c.name ? persist(list.filter((x) => x.name !== c.name), 'נמחק') : setDel(c.name))} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <a className={`btn !min-h-10 gap-1.5 !px-2 text-[15px] ${c.email ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!c.email} href={c.email ? gmailUrl(c.email, '', '') : undefined} target="_blank" rel="noreferrer"><Icon name="mail" size={16} />מייל</a>
                    <a className={`btn !min-h-10 gap-1.5 !px-2 text-[15px] ${wa ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!wa} href={wa ?? undefined} target="_blank" rel="noreferrer"><Icon name="send" size={16} />ווצאפ</a>
                    <button type="button" className="btn !min-h-10 gap-1.5 !px-2 text-[15px]" onClick={() => nav('/work', { state: { ask: `תכתוב ${c.email || !c.phone ? 'מייל' : 'הודעת ווצאפ'} ל${c.name}: ` } })}><Icon name="spark" size={16} />ניסוח בשיחה</button>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="m-0 mt-5 text-sm text-mute">
            מייל וווצאפ פותחים חלון כתיבה ריק, והשליחה בלחיצה שלך. טלפון נכתב כנייד ישראלי: 050-1234567, 0501234567 או 972501234567+. "ניסוח בשיחה" מבקש מהבוט לכתוב את ההודעה. כפתור אפור: חסרה כתובת או טלפון.
          </p>
        </>
      )}
    </div>
  )
}
