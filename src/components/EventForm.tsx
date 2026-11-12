import { useState } from 'react'
import type { EventDraft } from '../types'
import { useSpeech } from '../hooks/useSpeech'

// טופס אירוע משותף לאישור חילוץ ולעריכה
export default function EventForm({ value, onChange, showErrors }: { value: EventDraft; onChange: (v: EventDraft) => void; showErrors: boolean }) {
  const [peopleText, setPeopleText] = useState(value.people.join(', '))
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => onChange({ ...value, [k]: v })
  const speech = useSpeech((t) => set('description', ((value.description ?? '') + ' ' + t).trim()))

  const missingTitle = showErrors && !value.title.trim()
  const missingDate = showErrors && !value.event_date

  return (
    <div className="grid gap-4">
      <div>
        <label className="label" htmlFor="f-title">שם האירוע</label>
        <input id="f-title" className={`field ${missingTitle ? 'invalid' : ''}`} value={value.title} onChange={(e) => set('title', e.target.value)} />
        {missingTitle && <p className="mt-1 text-sm text-bad">חסר שם. כדאי להזין שם קצר לאירוע.</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="f-date">תאריך</label>
          <input id="f-date" type="date" className={`field num ${missingDate ? 'invalid' : ''}`} value={value.event_date ?? ''} onChange={(e) => set('event_date', e.target.value || null)} />
        </div>
        <div>
          <label className="label" htmlFor="f-time">שעה (לא חובה)</label>
          <input id="f-time" type="time" className="field num" value={value.event_time ?? ''} onChange={(e) => set('event_time', e.target.value || null)} />
        </div>
      </div>
      {missingDate && <p className="-mt-2 text-sm text-bad">לא נמצא תאריך במסמך. בחרי תאריך כדי לשמור.</p>}
      <div>
        <label className="label" htmlFor="f-loc">מיקום</label>
        <input id="f-loc" className="field" value={value.location ?? ''} onChange={(e) => set('location', e.target.value || null)} />
      </div>
      <div>
        <label className="label" htmlFor="f-ppl">אנשים (מופרדים בפסיק)</label>
        <input
          id="f-ppl"
          className="field"
          value={peopleText}
          onChange={(e) => {
            setPeopleText(e.target.value)
            set('people', e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean))
          }}
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="f-desc">תיאור</label>
          {speech.supported && (
            <button type="button" className="mb-1 text-sm text-navy underline underline-offset-4" onClick={speech.toggle}>
              {speech.listening ? 'עצירת הקלטה' : 'הקלטה ותמלול'}
            </button>
          )}
        </div>
        <textarea id="f-desc" rows={3} className="field resize-none" value={value.description ?? ''} onChange={(e) => set('description', e.target.value || null)} />
      </div>
    </div>
  )
}
