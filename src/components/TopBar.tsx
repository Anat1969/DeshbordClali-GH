import { Link, NavLink } from 'react-router-dom'
import AIMenu from './AIMenu'
import Icon, { type IconName } from './Icon'
import Logo from './Logo'
import Guide from './Guide'
import ViewPicker from './ViewPicker'
import { demoMode } from '../lib/supabase'

// כפתורי גישה ישירה למסכים. בנייד: אייקונים בלבד. במסך רחב: אייקון ושם
const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'דף בית', icon: 'sun', end: true },
  { to: '/office', label: 'המשרד', icon: 'briefcase' },
  { to: '/calendar', label: 'יומן', icon: 'calendar' },
  { to: '/tasks', label: 'משימות', icon: 'check' },
  { to: '/work', label: 'שיחה', icon: 'spark' },
  { to: '/contacts', label: 'אנשי קשר', icon: 'users' },
  { to: '/projects', label: 'פרויקטים', icon: 'chart' },
  { to: '/upgrades', label: 'שדרוג אפליקציות', icon: 'target' },
]

// סרגל עליון קבוע: תפריט <ai-menu> מימין, כפתורי המסכים באמצע, והלוגו משמאל. הלוגו מחזיר לדף הבית
export default function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 bg-white px-3 shadow-[0_1px_0_#E6E8EC] sm:px-6">
      <AIMenu />
      <nav aria-label="מסכי האפליקציה" className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            title={n.label}
            aria-label={n.label}
            className={({ isActive }) => `flex h-10 shrink-0 items-center gap-2 rounded-lg px-2 text-[15px] transition-colors sm:px-2.5 xl:px-3 ${isActive ? 'bg-[#E8ECF4] font-semibold text-navy shadow-[inset_0_-3px_0_#1A2B4A]' : 'text-ink hover:bg-soft'}`}
          >
            <Icon name={n.icon} size={20} />
            <span className="hidden lg:inline">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <ViewPicker />
        <Guide />
        {demoMode && (
          <span className="hidden rounded-md bg-soft px-2 py-1 text-xs 2xl:inline" title="אין חיבור ל-Supabase. הנתונים נשמרים בדפדפן הזה בלבד">
            מצב הדגמה
          </span>
        )}
        <Link to="/" aria-label="יומן חכם: חזרה לדף הבית" title="חזרה לדף הבית" className="hidden items-center gap-2.5 rounded-lg px-1.5 py-1 text-xl font-light tracking-tight text-navy hover:bg-soft sm:flex">
          <Logo size={32} />
          <span className="hidden md:inline">יומן <b>חכם</b></span>
        </Link>
      </div>
    </header>
  )
}
