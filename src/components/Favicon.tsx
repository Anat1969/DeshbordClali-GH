import { useState } from 'react'
import Icon, { type IconName } from './Icon'

// אייקון האתר. נטען משירות האייקונים של Google לפי שם האתר בלבד (דומיין). אם אין, מוצג אייקון כללי
export default function Favicon({ url, size = 16, fallback = 'globe' }: { url: string; size?: number; fallback?: IconName }) {
  const [broken, setBroken] = useState(false)
  let host = ''
  try { host = new URL(url).hostname } catch { /* כתובת לא תקינה */ }
  if (!host || broken) return <Icon name={fallback} size={size} className="shrink-0" />
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="shrink-0 rounded-sm object-contain"
      style={{ width: size, height: size }}
    />
  )
}
