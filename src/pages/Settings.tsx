import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/ctx'
import { getProfile, saveProfile } from '../lib/store'
import { normalizePhone, sendTestMessage } from '../lib/whatsapp'
import { demoMode } from '../lib/supabase'

// הגדרות: מספר ווצאפ (נשמר אוטומטית), בדיקת שליחה, חשבון
export default function Settings() {
  const app = useApp()
  const [num, setNum] = useState('')
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [sending, setSending] = useState(false)
  const timer = useRef<number>(0)
  const loaded = useRef(false)

  useEffect(() => {
    getProfile().then((p) => {
      setNum(p.whatsapp_number)
      loaded.current = true
    })
  }, [])

  const valid = num === '' || normalizePhone(num) !== null

  // שמירה אוטומטית כמה רגעים אחרי ההקלדה
  const change = (v: string) => {
    setNum(v)
    setSaved('idle')
    window.clearTimeout(timer.current)
    const n = normalizePhone(v)
    if (!n) return
    timer.current = window.setTimeout(async () => {
      setSaved('saving')
      try {
        await saveProfile({ whatsapp_number: n })
        setSaved('saved')
      } catch {
        setSaved('error')
      }
    }, 600)
  }

  const test = async () => {
    const n = normalizePhone(num)
    if (!n) return
    setSending(true)
    try {
      await sendTestMessage(n)
      app.toast('הודעת בדיקה נשלחה')
    } catch (e) {
      app.toast(e instanceof Error ? e.message : 'השליחה נכשלה')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <Link to="/" className="mb-6 inline-block text-navy underline underline-offset-4">חזרה אל: היומן</Link>
      <h1 className="text-3xl font-light">הגדרות <b>ווצאפ</b></h1>
      <p className="mb-8 mt-1 text-mute">תזכורת נשלחת יום לפני כל אירוע, בשמונה בבוקר.</p>

      <label className="label" htmlFor="wa">מספר ווצאפ לתזכורות</label>
      <input id="wa" inputMode="tel" dir="ltr" placeholder="050-0000000" className={`field num text-right ${valid ? '' : 'invalid'}`} value={num} onChange={(e) => change(e.target.value)} />
      <p className="mt-1 h-5 text-sm">
        {!valid && <span className="text-bad">המספר לא תקין. דוגמה: 050-1234567.</span>}
        {valid && saved === 'saving' && <span className="text-mute">שומר...</span>}
        {valid && saved === 'saved' && <span className="text-good">נשמר</span>}
        {saved === 'error' && <span className="text-bad">השמירה נכשלה. נסי שוב.</span>}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={!normalizePhone(num) || sending || demoMode} onClick={test}>
          {sending ? 'שולח' : 'שליחת הודעת בדיקה'}
        </button>
        {demoMode && <span className="text-sm text-mute">זמין אחרי חיבור Supabase ו-Twilio.</span>}
      </div>
      <p className="mt-3 rounded-lg bg-soft p-3 text-sm text-mute">
        ב-sandbox של Twilio צריך קודם לשלוח מהווצאפ את קוד ההצטרפות למספר של Twilio. בלי זה ההודעה לא תגיע.
      </p>

      <h2 className="mb-2 mt-10 text-xl font-light">חשבון</h2>
      <p className="text-mute">{app.email ?? 'מצב הדגמה: אין התחברות, הנתונים נשמרים בדפדפן הזה.'}</p>
      {app.email !== null && <button type="button" className="btn mt-3" onClick={app.signOut}>יציאה</button>}
    </div>
  )
}
