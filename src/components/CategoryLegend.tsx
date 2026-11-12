import { useState } from 'react'
import Icon from './Icon'
import { SLOTS } from '../lib/categories'
import { useApp } from '../lib/ctx'

// מקרא: שבעה צבעי קשת. אפשר לערוך את שמות הקטגוריות, ושלושה צבעים פנויים לשמות חדשים
export default function CategoryLegend() {
  const { cats } = useApp()
  const [edit, setEdit] = useState(false)

  return (
    <section className="mt-3" aria-label="מקרא קטגוריות">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm text-mute">מקרא: כל יום נצבע ומסומן באייקון של הקטגוריה. מסגרת שחורה היא היום, תמיד במרכז. קו כחול תחתון הוא היום שנבחר. שישי ושבת באפור בהיר. קו עבה הוא גבול חודש.</p>
        <div className="flex shrink-0 items-center gap-3">
          {edit && cats.save === 'saving' && <span className="text-sm text-mute">שומר...</span>}
          {edit && cats.save === 'saved' && <span className="text-sm text-good">נשמר</span>}
          {edit && cats.save === 'error' && <span className="text-sm text-bad">השמירה נכשלה</span>}
          <button type="button" className="btn !min-h-9 gap-1.5 !px-3 text-sm" onClick={() => setEdit((e) => !e)}>
            <Icon name={edit ? 'check' : 'pencil'} size={14} />
            {edit ? 'סיום עריכה' : 'עריכת קטגוריות'}
          </button>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
        {SLOTS.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded" style={{ background: s.color, color: s.fg }} aria-hidden="true">
              <Icon name={s.icon} size={15} />
            </span>
            {edit ? (
              <input
                className="field !min-h-9 !w-32 !py-1 text-sm"
                value={cats.names[s.key]}
                placeholder={`שם ל${s.label}`}
                aria-label={`שם הקטגוריה ב${s.label}`}
                onChange={(e) => cats.rename(s.key, e.target.value)}
              />
            ) : cats.names[s.key].trim() ? (
              <span>{cats.names[s.key]}</span>
            ) : (
              <span className="text-mute">{s.label}, פנוי</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
