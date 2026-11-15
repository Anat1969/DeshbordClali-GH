import { useEffect, useState } from 'react'

// שעון עגול חי: מספרי שעות 1 עד 12, סימוני דקות, מספרי דקות כל חמש, ומחוגים שזזים כל שנייה
const C = 100
const pt = (deg: number, r: number) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)]

export default function Clock({ size = 168 }: { size?: number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const s = now.getSeconds()
  const m = now.getMinutes() + s / 60
  const h = (now.getHours() % 12) + m / 60
  const label = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const hand = (deg: number, len: number, w: number, color: string) => {
    const [x, y] = pt(deg, len)
    return <line x1={C} y1={C} x2={x} y2={y} stroke={color} strokeWidth={w} strokeLinecap="round" />
  }
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`השעה ${label}`} className="shrink-0" style={{ direction: 'ltr' }}>
      <circle cx={C} cy={C} r="97" fill="#FFFFFF" stroke="#1A2B4A" strokeWidth="3" />
      <circle cx={C} cy={C} r="97" fill="none" stroke="#FFE066" strokeWidth="1.5" strokeDasharray="2 5" opacity=".9" />
      {Array.from({ length: 60 }, (_, i) => {
        const big = i % 5 === 0
        const [x1, y1] = pt(i * 6, big ? 84 : 88)
        const [x2, y2] = pt(i * 6, 93)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={big ? '#1A2B4A' : '#9AA3B2'} strokeWidth={big ? 2.2 : 1} strokeLinecap="round" />
      })}
      {/* מספרי דקות קטנים, כל חמש דקות */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = pt((i + 1) * 30, 74)
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#6B6F76" className="num">{(i + 1) * 5}</text>
      })}
      {/* מספרי שעות */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = pt((i + 1) * 30, 56)
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="19" fontWeight="600" fill="#111111" className="num">{i + 1}</text>
      })}
      {hand(h * 30, 36, 5, '#1A2B4A')}
      {hand(m * 6, 60, 3.2, '#1A2B4A')}
      {hand(s * 6, 66, 1.4, '#C6613F')}
      <circle cx={C} cy={C} r="4.5" fill="#1A2B4A" />
      <circle cx={C} cy={C} r="1.8" fill="#FFE066" />
    </svg>
  )
}
