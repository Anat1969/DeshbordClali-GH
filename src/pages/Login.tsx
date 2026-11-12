import { useState } from 'react'

// כניסה: בלי חשבון וסיסמה. פותחים את הקישור הפרטי פעם אחת בכל מכשיר
export default function Login({ onEnter }: { onEnter: (k: string) => void }) {
  const [v, setV] = useState('')
  // מקבל גם קישור שלם וגם מפתח בלבד
  const key = (v.match(/k=([A-Za-z0-9_-]{20,})/)?.[1] ?? v).trim()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-5xl font-light text-navy">יומן <b>חכם</b></h1>
      <p className="text-lg text-mute">היומן פרטי. כדי להיכנס, פותחים את הקישור האישי שקיבלת, פעם אחת בכל מכשיר.</p>
      <div className="w-full text-right">
        <label className="label" htmlFor="k">או מדביקים כאן את הקישור</label>
        <input id="k" dir="ltr" className="field num" value={v} onChange={(e) => setV(e.target.value)} placeholder="https://yoman-gh.vercel.app/#k=..." />
      </div>
      <button type="button" className="btn btn-primary min-h-12 w-full" disabled={key.length < 20} onClick={() => onEnter(key)}>כניסה</button>
    </main>
  )
}
