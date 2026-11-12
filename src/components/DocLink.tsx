import { useState } from 'react'
import Favicon from './Favicon'
import Icon from './Icon'
import { useApp } from '../lib/ctx'
import { taskDocUrl } from '../lib/tasks'
import type { TaskDoc } from '../types'

export const formatSize = (b?: number) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)

// מסמך של משימה: קישור נפתח בלשונית חדשה (עם אייקון האתר), וקובץ נפתח דרך כתובת חתומה
export default function DocLink({ taskId, doc, big }: { taskId: string; doc: TaskDoc; big?: boolean }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const cls = big
    ? 'btn !h-auto !min-h-10 !justify-start gap-2.5 !py-2 text-right text-[15px]'
    : 'inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-right text-sm shadow-btn hover:bg-[#F7F8FA]'

  if (doc.kind === 'link' && doc.url) {
    return (
      <a href={doc.url} target="_blank" rel="noopener noreferrer" className={cls} title={doc.url}>
        <Favicon url={doc.url} size={big ? 20 : 16} />
        <span className="min-w-0 break-words">{doc.name}</span>
        <Icon name="external" size={12} className="shrink-0 text-mute" />
      </a>
    )
  }

  const open = async () => {
    // החלון נפתח מיד בלחיצה, כדי שחוסם חלונות לא יחסום אותו
    const w = window.open('about:blank', '_blank')
    setBusy(true)
    try {
      const url = await taskDocUrl(taskId, doc.id)
      if (url && w) {
        w.opener = null
        w.location.href = url
      } else {
        w?.close()
        app.toast('המסמך לא זמין')
      }
    } catch {
      w?.close()
      app.toast('פתיחת המסמך נכשלה')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" className={cls} disabled={busy} onClick={open}>
      <Icon name="file" size={big ? 20 : 16} className="shrink-0" />
      <span className="min-w-0 break-words">{doc.name}</span>
      {doc.size ? <span className="num shrink-0 text-xs text-mute">{formatSize(doc.size)}</span> : null}
    </button>
  )
}
