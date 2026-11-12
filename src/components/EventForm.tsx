import { useState } from 'react'
import type { EventDraft } from '../types'
import { useSpeech } from '../hooks/useSpeech'
import Icon from './Icon'
import VoiceButton from './VoiceButton'
import { SLOTS, slotOf } from '../lib/categories'
import { useApp } from '../lib/ctx'

// טופס אירוע משותף לאישור חילוץ ולעריכה
export default function EventForm({ value, onChange, showErrors, autoFocus, onSubmit }: { value: EventDraft; onChange: (v: EventDraft) => void; showErrors: boolean; autoFocus?: boolean; onSubmit?: () => void }) {
  const { cats } = useApp()
  const [peopleText, setPeopleText] = useState(value.people.join(', '))
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => onChange({ ...value, [k]: v })
  const speech = useSpeech((t) => set('description', ((value.description ?? '') + ' ' + t).trim()))

  const missingTitle = showErrors && !value.title.trim()
  const missingDate = showErrors && !value.event_date

  return (
    <div className="grid gap-4">
      <div>
        <label className="label" htmlFor="f-title">שם האירוע</label>
        <input id="f-title" autoFocus={autoFocus} className={`field ${missingTitle ? 'invalid' : ''}`} value={value.title} onChange={(e) => set('title', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()} />
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
        <div className="label">קטגוריה (קובעת את צבע היום)</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="קטגוריה">
          <button type="button" role="radio" aria-checked={!value.category} className="btn !min-h-10 !px-4" style={!value.category ? { boxShadow: '0 0 0 3px #1A2B4A' } : undefined} onClick={() => set('category', null)}>
            ללא
          </button>
          {SLOTS.filter((s) => cats.names[s.key].trim()).map((s) => {
            const on = value.category === s.key
            return (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={on}
                className="btn !min-h-10 !px-4"
                style={{ background: s.color, color: s.fg, fontWeight: on ? 600 : 400, boxShadow: on ? '0 0 0 3px #fff, 0 0 0 6px #1A2B4A' : undefined }}
                onClick={() => set('category', s.key)}
              >
                <Icon name={s.icon} size={16} />
                {cats.names[s.key]}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm text-mute">
          {value.category ? `נבחר: ${cats.names[value.category as keyof typeof cats.names] || slotOf(value.category)?.label}` : 'לא נבחרה קטגוריה. שמות אפשר להוסיף במקרא שמתחת ללוח.'}
        </p>
      </div>
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
        <label className="label" htmlFor="f-desc">תיאור</label>
        <textarea id="f-desc" rows={3} className="field resize-none" value={value.description ?? ''} onChange={(e) => set('description', e.target.value || null)} />
        <VoiceButton speech={speech} className="mt-2" />
      </div>
    </div>
  )
}
