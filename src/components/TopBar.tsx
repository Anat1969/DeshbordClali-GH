import { Link, NavLink } from 'react-router-dom'
import AIMenu from './AIMenu'
import Icon, { type IconName } from './Icon'
import Logo from './Logo'
import { demoMode } from '../lib/supabase'

// כפתורי גישה ישירה למסכים. בנייד: אייקונים בלבד. במסך רחב: אייקון ושם
const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'יומן', icon: 'calendar', end: true },
  { to: '/welcome', label: 'תדרוך בוקר', icon: 'sun' },
  { to: '/work', label: 'מסך עבודה', icon: 'spark' },
  { to: '/projects', label: 'מעקב פרויקטים', icon: 'chart' },
]

// סרגל עליון קבוע: תפריט <ai-menu> מימין, כפתורי המסכים באמצע, והלוגו משמאל. הלוגו מחזיר לדף הבית
export default function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 bg-white px-3 shadow-[0_1px_0_#E6E8EC] sm:px-6">
      <AIMenu />
      <nav aria-label="מסכי האפליקציה" className="flex items-center gap-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            title={n.label}
            aria-label={n.label}
            className={({ isActive }) => `flex h-10 items-center gap-2 rounded-lg px-2.5 text-[15px] transition-colors lg:px-3.5 ${isActive ? 'bg-[#E8ECF4] font-semibold text-navy shadow-[inset_0_-3px_0_#1A2B4A]' : 'text-ink hover:bg-soft'}`}
          >
            <Icon name={n.icon} size={20} />
            <span className="hidden lg:inline">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {demoMode && (
          <span className="hidden rounded-md bg-mark px-2 py-1 text-xs sm:inline" title="אין חיבור ל-Supabase. הנתונים נשמרים בדפדפן הזה בלבד">
            מצב הדגמה
          </span>
        )}
        <Link to="/" aria-label="יומן חכם: חזרה לדף הבית" title="חזרה לדף הבית" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-xl font-light tracking-tight text-navy hover:bg-soft">
          <Logo size={32} />
          <span className="hidden sm:inline">יומן <b>חכם</b></span>
        </Link>
      </div>
    </header>
  )
}
