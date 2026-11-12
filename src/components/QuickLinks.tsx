import { useState } from 'react'
import Favicon from './Favicon'
import Icon, { IconButton } from './Icon'
import { useApp } from '../lib/ctx'

// קישורים חשובים: פתיחה בלשונית חדשה. עריכה: הוספה ב-+ והסרה ב-X
export default function QuickLinks() {
  const { links } = useApp()
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const submit = () => {
    if (!name.trim() || !url.trim()) return
    links.add(name, url)
    setName('')
    setUrl('')
  }

  return (
    <section aria-label="קישורים חשובים" className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-mute"><Icon name="link" size={14} />קישורים חשובים</span>
      {links.items.map((l, i) => (
        <span key={`${l.url}-${i}`} className="inline-flex items-center">
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn !min-h-9 gap-1.5 !px-3 text-sm">
            <Favicon url={l.url} size={16} fallback={/מייל|mail/i.test(l.name) ? 'mail' : 'link'} />
            {l.name}
            <Icon name="external" size={12} className="text-mute" />
          </a>
          {edit && <IconButton name="x" label={`הסרת ${l.name}`} tone="danger" size={14} className="!h-7 !w-7" onClick={() => links.remove(i)} />}
        </span>
      ))}
      <IconButton name={edit ? 'check' : 'pencil'} label={edit ? 'סיום עריכת קישורים' : 'עריכת קישורים'} size={16} className="!h-8 !w-8" onClick={() => setEdit((e) => !e)} />
      {edit && (
        <span className="flex flex-wrap items-center gap-2">
          <input className="field !min-h-9 !w-32 !py-1 text-sm" placeholder="שם" aria-label="שם הקישור" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="field num !min-h-9 !w-52 !py-1 text-sm" dir="ltr" placeholder="https://..." aria-label="כתובת הקישור" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <IconButton name="plus" label="הוספת קישור" tone="primary" size={16} className="!h-9 !w-9" disabled={!name.trim() || !url.trim()} onClick={submit} />
        </span>
      )}
      {links.error && <span className="text-sm text-bad" role="alert">השמירה נכשלה</span>}
    </section>
  )
}
