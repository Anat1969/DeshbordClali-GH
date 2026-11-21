import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { VIEWS, setHomeView, useHomeView } from '../lib/view'

// כפתור "תצוגה" בסרגל העליון: בוחרים איך דף הבית נראה. הנבחר מסומן בווי ובמילה "נבחר", ו"רגיל" הוא ברירת המחדל
export default function ViewPicker() {
  const view = useHomeView()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof MouseEvent && box.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])

  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" className={`flex h-10 items-center gap-2 rounded-lg px-2.5 text-[15px] transition-colors ${open ? 'bg-[#E8ECF4] font-semibold text-navy' : 'bg-soft hover:bg-[#E9EBEF]'}`} aria-haspopup="menu" aria-expanded={open} aria-label="בחירת תצוגה לדף הבית" title="בחירת תצוגה לדף הבית" onClick={() => setOpen((o) => !o)}>
        <Icon name="sliders" size={20} />
        <span className="hidden xl:inline">תצוגה</span>
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-12 z-30 w-[min(22rem,calc(100vw-1.5rem))] rounded-lg bg-white p-2 shadow-pop">
          <p className="m-0 px-3 pb-1 pt-2 text-sm text-mute">איך דף הבית נראה. אפשר להחליף בכל רגע, ושום נתון לא משתנה.</p>
          {VIEWS.map((v) => {
            const on = v.key === view
            return (
              <button key={v.key} type="button" role="menuitemradio" aria-checked={on} onClick={() => { setHomeView(v.key); setOpen(false); nav('/') }}
                className={`mt-1 flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-right ${on ? 'bg-[#E8ECF4] shadow-[inset_-4px_0_0_#1A2B4A]' : 'hover:bg-soft'}`}>
                <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded ${on ? 'bg-navy text-white' : 'bg-soft'}`}>{on && <Icon name="check" size={14} />}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[#111111]">{v.name}{on && <span className="ms-2 text-sm font-normal text-navy">נבחר</span>}{v.key === 'classic' && <span className="ms-2 text-sm font-normal text-mute">ברירת המחדל</span>}</span>
                  <span className="block text-[15px] leading-snug text-mute">{v.text}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
