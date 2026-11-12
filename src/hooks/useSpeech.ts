import { useEffect, useRef, useState } from 'react'

// הקלטה ותמלול בעברית (Web Speech של הדפדפן).
// כל כשל מוצג בעברית עם הוראה לתיקון, והטקסט מופיע חי בזמן הדיבור
interface SpeechEvent { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }
interface Rec {
  lang: string; continuous: boolean; interimResults: boolean
  onstart: () => void; onend: () => void
  onerror: (e: { error: string }) => void
  onresult: (e: SpeechEvent) => void
  start: () => void; stop: () => void
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'הדפדפן חסם את המיקרופון. לוחצים על סמל המנעול ליד כתובת האתר, ומאפשרים מיקרופון.',
  'service-not-allowed': 'הדפדפן חסם את התמלול. לוחצים על סמל המנעול ליד כתובת האתר, ומאפשרים מיקרופון.',
  'no-speech': 'לא נשמע דיבור. מקרבים את המיקרופון ולוחצים שוב.',
  'audio-capture': 'לא נמצא מיקרופון במכשיר.',
  network: 'שירות התמלול של הדפדפן לא זמין ברשת הזו. אפשר להשתמש בהקלדה הקולית של המערכת (ב-Windows: Win+H).',
}

export function useSpeech(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Rec | null>(null)
  // תמיד הפונקציה העדכנית, כדי שהטקסט לא יידרס
  const cb = useRef(onFinal)
  cb.current = onFinal

  const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition
  const supported = Boolean(Ctor)

  useEffect(() => () => rec.current?.stop(), [])

  const start = () => {
    if (!Ctor) return
    setError(null)
    setInterim('')
    const r = new Ctor()
    r.lang = 'he-IL'
    r.continuous = true
    r.interimResults = true
    r.onstart = () => setListening(true)
    r.onresult = (e) => {
      let fin = ''
      let tmp = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) fin += res[0].transcript
        else tmp += res[0].transcript
      }
      if (fin.trim()) cb.current(fin.trim())
      setInterim(tmp)
    }
    r.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERRORS[e.error] ?? `התמלול נכשל (${e.error}). אפשר לנסות שוב.`)
    }
    r.onend = () => {
      setListening(false)
      setInterim('')
    }
    rec.current = r
    try {
      r.start()
    } catch {
      setError('לא ניתן להתחיל הקלטה. נסי שוב בעוד רגע.')
    }
  }

  const stop = () => rec.current?.stop()
  const toggle = () => (listening ? stop() : start())
  return { supported, listening, interim, error, start, stop, toggle }
}
