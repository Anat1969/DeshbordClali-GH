import { useState } from 'react'
import type { EventDraft } from '../types'
import EventForm from './EventForm'
import Modal from './Modal'
import { todayIso, daysUntil } from '../lib/dateUtils'

// מה חולץ: ענת בודקת, עורכת ומאשרת לפני שמירה
export default function ExtractionReview({ draft, manual, onSave, onCancel }: { draft: EventDraft; manual: boolean; onSave: (d: EventDraft) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState(draft)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showSrc, setShowSrc] = useState(false)

  const missing = [!v.title.trim() && 'שם', !v.event_date && 'תאריך'].filter(Boolean) as string[]
  const past = v.event_date && daysUntil(v.event_date, todayIso()) < 0

  const save = async () => {
    setTried(true)
    if (missing.length) return
    setBusy(true)
    setErr(null)
    try {
      await onSave(v)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'השמירה נכשלה')
      setBusy(false)
    }
  }

  return (
    <Modal title="אישור פרטי האירוע" onClose={onCancel} wide>
      <h2 className="text-2xl font-light">{manual ? 'אירוע חדש' : 'זה מה שחולץ מהמסמך'}</h2>
      <p className="mb-5 mt-1 text-sm text-mute">
        {manual ? 'ממלאים את הפרטים ושומרים.' : missing.length ? `חסר: ${missing.join(' ו')}. אפשר להשלים כאן.` : 'כל השדות ניתנים לעריכה. האירוע נשמר רק אחרי אישור.'}
      </p>
      <div className="grid gap-6 md:grid-cols-[1fr_.8fr]">
        <EventForm value={v} onChange={setV} showErrors={tried} />
        {!manual && (
          <aside className="min-w-0 text-sm">
            <div className="label">מקור</div>
            {v.source_file_name && <p className="mb-2 truncate font-semibold">{v.source_file_name}</p>}
            {v.raw_source ? (
              <>
                <pre className={`whitespace-pre-wrap break-words rounded-lg bg-soft p-3 font-sans text-mute ${showSrc ? 'max-h-72 overflow-auto' : 'line-clamp-6'}`}>{v.raw_source}</pre>
                <button type="button" className="mt-1 text-navy underline underline-offset-4" onClick={() => setShowSrc((s) => !s)}>
                  {showSrc ? 'הצגה מקוצרת' : 'הצגת כל הטקסט'}
                </button>
              </>
            ) : (
              <p className="text-mute">אין טקסט מקור לתצוגה.</p>
            )}
          </aside>
        )}
      </div>
      {past && <p className="mt-4 rounded-lg bg-mark px-3 py-2 text-sm">התאריך שנבחר כבר עבר. כדאי לוודא שזה נכון.</p>}
      {err && <p className="mt-4 text-sm text-bad">{err}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" className="btn btn-primary min-w-32" disabled={busy} onClick={save}>
          {busy ? 'שומר' : 'שמירה ביומן'}
        </button>
        <button type="button" className="btn min-w-32" onClick={onCancel} disabled={busy}>ביטול</button>
      </div>
    </Modal>
  )
}
