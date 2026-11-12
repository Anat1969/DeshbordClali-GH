import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CalEvent, EventDraft } from '../types'
import EventForm from './EventForm'
import Modal from './Modal'
import { useApp } from '../lib/ctx'
import { formatLong, formatTime, relativeDays } from '../lib/dateUtils'
import { getSourceUrl } from '../lib/store'

// פרטי אירוע מלאים: צפייה, עריכה ומחיקה. משמש גם בחלון וגם בעמוד האירוע
export function EventBody({ event, onDone, inPage }: { event: CalEvent; onDone: () => void; inPage?: boolean }) {
  const app = useApp()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EventDraft>(event)
  const [tried, setTried] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setTried(true)
    if (!draft.title.trim() || !draft.event_date) return
    setBusy(true)
    try {
      await app.ev.update(event.id, draft)
      app.toast('נשמר')
      setEditing(false)
    } catch {
      app.toast('השמירה נכשלה, השינוי בוטל')
    } finally {
      setBusy(false)
    }
  }

  const del = async () => {
    setBusy(true)
    try {
      await app.ev.remove(event.id)
      app.toast('האירוע נמחק')
      onDone()
    } catch {
      app.toast('המחיקה נכשלה')
      setBusy(false)
    }
  }

  const openSource = async () => {
    const url = event.source_file_url ? await getSourceUrl(event.source_file_url) : null
    if (url) window.open(url, '_blank', 'noopener')
    else app.toast('המסמך המקורי לא זמין')
  }

  if (editing) {
    return (
      <>
        <h2 className="mb-5 text-2xl font-light">עריכת אירוע</h2>
        <EventForm value={draft} onChange={setDraft} showErrors={tried} />
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-primary min-w-32" disabled={busy} onClick={save}>שמירה</button>
          <button type="button" className="btn min-w-32" onClick={() => (setDraft(event), setEditing(false))}>ביטול</button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="text-sm text-mute">{relativeDays(event.event_date)}</p>
      <h2 className="mt-1 text-3xl font-light leading-tight">{event.title}</h2>
      <dl className="mt-6 grid gap-4">
        <Row k="מתי" v={`${formatLong(event.event_date)}${event.event_time ? `, בשעה ${formatTime(event.event_time)}` : ''}`} />
        {event.location && <Row k="איפה" v={event.location} />}
        {event.people.length > 0 && <Row k="עם מי" v={event.people.join(', ')} />}
        {event.description && <Row k="פרטים" v={event.description} />}
        <Row k="תזכורת בווצאפ" v={event.reminder_sent ? 'נשלחה' : 'תישלח יום לפני, בשמונה בבוקר'} />
      </dl>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary min-w-28" onClick={() => setEditing(true)}>עריכה</button>
        {event.source_file_url && <button type="button" className="btn" onClick={openSource}>המסמך המקורי</button>}
        {!inPage && <Link to={`/event/${event.id}`} className="btn" onClick={onDone}>פתיחה בדף</Link>}
        {confirmDel ? (
          <button type="button" className="btn btn-danger font-semibold" disabled={busy} onClick={del}>בטוחה? מחיקה סופית</button>
        ) : (
          <button type="button" className="btn btn-danger" onClick={() => setConfirmDel(true)}>מחיקה</button>
        )}
      </div>
    </>
  )
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div>
    <dt className="label !mb-0">{k}</dt>
    <dd className="m-0 whitespace-pre-wrap text-lg">{v}</dd>
  </div>
)

export default function EventModal({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  return (
    <Modal title={event.title} onClose={onClose}>
      <EventBody event={event} onDone={onClose} />
    </Modal>
  )
}
