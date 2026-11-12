import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/ctx'

// <ai-menu>: כפתור לוגו יחיד שמחזיק את כל פעולות העריכה והמערכת
export default function AIMenu() {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const app = useApp()

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof MouseEvent && box.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const act = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div ref={box} className="relative" data-ai-menu>
      <button
        type="button"
        className="btn !p-0 w-11"
        aria-label="תפריט פעולות"
        aria-haspopup="menu"
        aria-expanded={open}
        title="תפריט פעולות"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="5" y="7" width="22" height="20" rx="3" fill="none" stroke="#1A2B4A" strokeWidth="2.2" />
          <path d="M5 13h22" stroke="#1A2B4A" strokeWidth="2.2" />
          <path d="M16 15.5l1.5 3.2 3.2 1.5-3.2 1.5L16 24.9l-1.5-3.2-3.2-1.5 3.2-1.5z" fill="#1A2B4A" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute top-12 right-0 z-30 w-60 rounded-lg bg-white p-2 shadow-pop">
          <div className="px-3 pb-1 pt-2 text-xs text-mute">הוספה ליומן</div>
          <Item onClick={act(app.pickFile)}>העלאת מסמך</Item>
          <Item onClick={act(app.openPaste)}>הדבקת טקסט או אימייל</Item>
          <Item onClick={act(app.newManual)}>אירוע ידני</Item>
          <div className="px-3 pb-1 pt-3 text-xs text-mute">מערכת</div>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className="block min-h-11 rounded-md px-3 py-2.5 hover:bg-soft">
            הגדרות ווצאפ
          </Link>
          {app.email !== null && <Item onClick={act(app.signOut)}>יציאה</Item>}
        </div>
      )}
    </div>
  )
}

function Item({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="menuitem" type="button" onClick={onClick} className="block min-h-11 w-full rounded-md px-3 py-2.5 text-right hover:bg-soft">
      {children}
    </button>
  )
}
