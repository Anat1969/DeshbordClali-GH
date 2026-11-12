import type { CSSProperties } from 'react'

// אייקונים בקו דק אחיד, בשפה מינימליסטית. צבע לפי currentColor
export type IconName = 'briefcase' | 'glass' | 'cross' | 'book' | 'home' | 'star' | 'flag' | 'plus' | 'x' | 'mic' | 'stop'

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
