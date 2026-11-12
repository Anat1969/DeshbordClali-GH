import { Link } from 'react-router-dom'
import AIMenu from './AIMenu'
import Logo from './Logo'
import { demoMode } from '../lib/supabase'

// סרגל עליון קבוע: תפריט <ai-menu> מימין, והלוגו עם שם האפליקציה משמאל. הלוגו מחזיר לדף הבית
export default function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between bg-white px-4 shadow-[0_1px_0_#E6E8EC] sm:px-6">
      <AIMenu />
      <div className="flex items-center gap-3">
        {demoMode && (
          <span className="rounded-md bg-mark px-2 py-1 text-xs" title="אין חיבור ל-Supabase. הנתונים נשמרים בדפדפן הזה בלבד">
            מצב הדגמה
          </span>
        )}
        <Link to="/" aria-label="יומן חכם: חזרה לדף הבית" title="חזרה לדף הבית" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-xl font-light tracking-tight text-navy hover:bg-soft">
          <Logo size={32} />
          <span>יומן <b>חכם</b></span>
        </Link>
      </div>
    </header>
  )
}
