import { useState } from 'react'
import Icon, { IconButton } from './Icon'
import { SLOTS } from '../lib/categories'
import { useApp } from '../lib/ctx'

// מקרא: שבעה צבעי קשת. אפשר לערוך את שמות הקטגוריות, ושלושה צבעים פנויים לשמות חדשים
export default function CategoryLegend() {
  const { cats } = useApp()
  const [edit, setEdit] = useState(false)

  return (
    <section className="mt-3" aria-label="מקרא קטגוריות">
      <div className="mb-2 flex items-center justify-end gap-3">
        <div className="flex shrink-0 items-center gap-3">
          {edit && cats.save === 'saving' && <span className="text-sm text-mute">שומר...</span>}
          {edit && cats.save === 'saved' && <span className="text-sm text-good">נשמר</span>}
          {edit && cats.save === 'error' && <span className="text-sm text-bad">השמירה נכשלה</span>}
          <IconButton name={edit ? 'check' : 'pencil'} label={edit ? 'סיום עריכת קטגוריות' : 'עריכת קטגוריות'} size={16} className="!h-8 !w-8" onClick={() => setEdit((e) => !e)} />
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
