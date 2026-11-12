import { Link } from 'react-router-dom'
import AIMenu from './AIMenu'
import { demoMode } from '../lib/supabase'

// סרגל עליון קבוע: לוגו <ai-menu> מימין, שם האפליקציה משמאל (מקשר לבית)
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
        <Link to="/" className="text-xl font-light tracking-tight text-navy hover:opacity-70">
          יומן <b>חכם</b>
        </Link>
      </div>
    </header>
  )
}
