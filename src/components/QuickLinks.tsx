import { useState } from 'react'
import Favicon from './Favicon'
import Icon, { IconButton } from './Icon'
import { useApp } from '../lib/ctx'

const YT = /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i

// קישורים חשובים ושורה נפרדת של ערוצי יוטיוב. פתיחה בלשונית חדשה. עריכה: הוספה ב-+ והסרה ב-X
export default function QuickLinks() {
  return (
    <div className="grid gap-2">
      <Row label="קישורים חשובים" icon="link" yt={false} />
      <Row label="יוטיוב: ערוצים שאני עוקבת אחריהם" icon="play" yt />
    </div>
  )
}

function Row({ label, icon, yt }: { label: string; icon: 'link' | 'play'; yt: boolean }) {
  const { links } = useApp()
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [bad, setBad] = useState(false)

  // האינדקס נשמר מהרשימה המלאה, כדי שהסרה תפגע בפריט הנכון
  const rows = links.items.map((l, i) => ({ l, i })).filter(({ l }) => YT.test(l.url) === yt)
  const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`

  const submit = () => {
    if (!name.trim() || !url.trim()) return
    if (yt && !YT.test(normalized)) return setBad(true)
    setBad(false)
    links.add(name, url)
    setName('')
    setUrl('')
  }

  if (!rows.length && !yt) return null

  return (
    <section aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-mute"><Icon name={icon} size={14} />{label}</span>
      {rows.length === 0 && yt && !edit && <span className="text-sm text-mute">אין עדיין. לחצי על העיפרון והוסיפי ערוץ.</span>}
      {rows.map(({ l, i }) => (
        <span key={`${l.url}-${i}`} className="inline-flex items-center">
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn !min-h-9 gap-1.5 !px-3 text-sm">
            <Favicon url={l.url} size={16} fallback={/מייל|mail/i.test(l.name) ? 'mail' : 'link'} />
            {l.name}
            <Icon name="external" size={12} className="text-mute" />
          </a>
          {edit && <IconButton name="x" label={`הסרת ${l.name}`} tone="danger" size={14} className="!h-7 !w-7" onClick={() => links.remove(i)} />}
        </span>
      ))}
      <IconButton name={edit ? 'check' : 'pencil'} label={edit ? 'סיום עריכה' : `עריכת ${label}`} size={16} className="!h-8 !w-8" onClick={() => setEdit((e) => !e)} />
      {edit && (
        <span className="flex flex-wrap items-center gap-2">
          <input className="field !min-h-9 !w-32 !py-1 text-sm" placeholder={yt ? 'שם הערוץ' : 'שם'} aria-label="שם" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="field num !min-h-9 !w-52 !py-1 text-sm" dir="ltr" placeholder={yt ? 'https://youtube.com/@...' : 'https://...'} aria-label="כתובת" value={url} onChange={(e) => { setUrl(e.target.value); setBad(false) }} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <IconButton name="plus" label="הוספה" tone="primary" size={16} className="!h-9 !w-9" disabled={!name.trim() || !url.trim()} onClick={submit} />
          {bad && <span className="text-sm text-bad" role="alert">זו לא כתובת של יוטיוב</span>}
        </span>
      )}
      {links.error && yt && <span className="text-sm text-bad" role="alert">השמירה נכשלה</span>}
    </section>
  )
}
