import type { CSSProperties } from 'react'

// אייקונים בקו דק אחיד, בשפה מינימליסטית. צבע לפי currentColor
export type IconName =
  | 'briefcase' | 'glass' | 'cross' | 'book' | 'home' | 'star' | 'flag' | 'plus' | 'x' | 'mic' | 'stop'
  | 'chevronR' | 'chevronL' | 'pencil' | 'note' | 'clock' | 'pin' | 'users' | 'calendar' | 'file' | 'sliders' | 'upload' | 'text'
  | 'check' | 'link' | 'copy' | 'key' | 'logout' | 'sun' | 'bulb' | 'quote' | 'news' | 'target' | 'music' | 'spark' | 'dumbbell' | 'external' | 'mail' | 'send' | 'chart' | 'diamond' | 'paperclip' | 'globe'

const PATHS: Record<IconName, React.ReactNode> = {
  briefcase: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18" /></>),
  glass: (<><path d="M5 4h14l-7 8z" /><path d="M12 12v7M8 20h8" /></>),
  cross: (<><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" /></>),
  book: (<><path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13C17 4 14 4.5 12 6z" /><path d="M12 6v13" /></>),
  home: (<><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></>),
  star: <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z" />,
  flag: (<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  chevronR: <path d="M9 5l7 7-7 7" />,
  chevronL: <path d="M15 5l-7 7 7 7" />,
  pencil: (<><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z" /><path d="M14 7l3 3" /></>),
  note: (<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  pin: (<><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5a3.5 3.5 0 0 1 0 6.5M18.5 14.5A6.5 6.5 0 0 1 21.5 20" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  file: (<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>),
  sliders: (<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>),
  upload: (<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>),
  text: <path d="M4 6h16M4 12h16M4 18h10" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  copy: (<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>),
  key: (<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></>),
  logout: <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />,
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>),
  bulb: (<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>),
  quote: <path d="M9 7H5v6h4l-2 4M19 7h-4v6h4l-2 4" />,
  news: (<><path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  music: (<><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>),
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  dumbbell: <path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" />,
  external: <path d="M7 17L17 7M9 7h8v8" />,
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  send: <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />,
  chart: <path d="M4 20V11M10 20V4M16 20v-7M22 20H2" />,
  diamond: <path d="M12 3l8 9-8 9-8-9z" />,
  paperclip: <path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" />,
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>),
}

export default function Icon({ name, size = 18, className, style, strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; style?: CSSProperties; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

// כפתור אייקון קטן: תווית נגישה וחיווי בריחוף
export function IconButton({ name, label, onClick, tone = 'plain', size = 18, disabled, className = '' }: { name: IconName; label: string; onClick: (e: React.MouseEvent) => void; tone?: 'plain' | 'danger' | 'primary'; size?: number; disabled?: boolean; className?: string }) {
  const color = tone === 'danger' ? 'text-bad hover:bg-[#FBECEA]' : tone === 'primary' ? 'bg-navy text-white hover:bg-[#22375F]' : 'text-ink hover:bg-soft'
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${color} ${className}`}>
      <Icon name={name} size={size} />
    </button>
  )
}
