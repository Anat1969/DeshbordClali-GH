import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { clearReturn, readReturn } from '../lib/office'

// "חזרה לתוכנית העבודה": מופיע בכל מסך שנפתח מתוך תדריך הבוקר, וחוזר אליו בלחיצה
export default function OfficeReturn() {
  const path = useLocation().pathname
  const nav = useNavigate()
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    if (path === '/office') clearReturn()
    setLabel(path === '/office' ? null : readReturn())
  }, [path])
  if (!label) return null
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 bg-[#EEF2F8] px-3 py-1.5 sm:px-6">
      <button type="button" className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[15px] font-semibold text-navy hover:bg-white" onClick={() => nav('/office')}>
        <Icon name="chevronR" size={16} />חזרה ל{label}
      </button>
      <button type="button" className="rounded-md p-1 text-mute hover:bg-white" aria-label="הסתרה" onClick={() => (clearReturn(), setLabel(null))}><Icon name="x" size={14} /></button>
    </div>
  )
}
