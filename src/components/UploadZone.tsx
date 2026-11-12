import { useEffect, useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import VoiceButton from './VoiceButton'
import { useSpeech } from '../hooks/useSpeech'

// אזור גרירה: מסגרת מקווקווה שזזה כשקובץ מגיע. לחיצה פותחת בחירת קובץ
export default function UploadZone({ onFile, onPaste, onPick, onVoice, busy, step }: { onFile: (f: File) => void; onPaste: () => void; onPick: () => void; onVoice: () => void; busy: boolean; step: string }) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={`dropzone flex flex-col items-center justify-center gap-2 p-5 text-center ${over ? 'active' : ''}`}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
    >
      {busy ? (
        <p className="py-4 font-semibold text-navy" role="status">{step}...</p>
      ) : (
        <>
          <p className="text-lg font-light">{over ? 'עזבי כאן' : 'זרקי לכאן מסמך'}</p>
          <p className="text-sm text-mute">PDF, תמונה, אימייל או טקסט. הפרטים יחולצו לאישור שלך.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={onPick}>בחירת קובץ</button>
            <button type="button" className="btn" onClick={onPaste}>הדבקת טקסט</button>
            <button type="button" className="btn" onClick={onVoice}>
              <Icon name="mic" size={16} />
              הקלטת אירוע
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// חלון הדבקת טקסט חופשי או אימייל, או הקלטת אירוע בקול: המילים מתומללות, ואז מחולצים הפרטים
export function PasteDialog({ onSubmit, onClose, voice }: { onSubmit: (t: string) => void; onClose: () => void; voice?: boolean }) {
  const [t, setT] = useState('')
  const speech = useSpeech((x) => setT((v) => (v + ' ' + x).trim()))

  // בהקלטת אירוע ההקלטה מתחילה מיד
  useEffect(() => {
    if (voice) speech.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Modal title={voice ? 'הקלטת אירוע' : 'הדבקת טקסט'} onClose={onClose}>
      <h2 className="text-2xl font-light">{voice ? 'ספרי על האירוע בקול' : 'הדביקי טקסט או אימייל'}</h2>
      <p className="mb-3 mt-1 text-sm text-mute">
        {voice ? 'למשל: "פגישה עם רופא ביום ראשון בעשר בבוקר במרפאה". אפשר לתקן את הטקסט לפני החילוץ.' : 'הזמנה, הודעה או מייל. המערכת תחלץ ממנו תאריך, שעה, מקום ואנשים.'}
      </p>
      <VoiceButton speech={speech} label={voice ? 'הקלטה מחדש' : 'הקלטה ותמלול'} className="mb-3" />
      <textarea autoFocus={!voice} rows={voice ? 5 : 8} className="field resize-none" value={t} onChange={(e) => setT(e.target.value)} aria-label="הטקסט לחילוץ" />
      <div className="mt-5 flex gap-3">
        <button type="button" className="btn btn-primary min-w-32" disabled={t.trim().length < 5} onClick={() => (speech.stop(), onSubmit(t))}>חילוץ פרטים</button>
        <button type="button" className="btn min-w-32" onClick={onClose}>ביטול</button>
      </div>
    </Modal>
  )
}
