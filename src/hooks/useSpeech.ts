import { useRef, useState } from 'react'

// הקלטה ותמלול בעברית (Web Speech). אם הדפדפן לא תומך, הכפתור לא מוצג
type Rec = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void; stop: () => void }

export function useSpeech(onText: (t: string) => void) {
  const [listening, setListening] = useState(false)
  const rec = useRef<Rec | null>(null)
  const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition
  const supported = Boolean(Ctor)

  const toggle = () => {
    if (!Ctor) return
    if (listening) {
      rec.current?.stop()
      return
    }
    const r = new Ctor()
    r.lang = 'he-IL'
    r.interimResults = false
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '))
    r.onend = () => setListening(false)
    rec.current = r
    setListening(true)
    r.start()
  }
  return { supported, listening, toggle }
}
