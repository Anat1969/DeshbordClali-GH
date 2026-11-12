import { useState } from 'react'
import Modal from './Modal'

// אזור גרירה: מסגרת מקווקווה שזזה כשקובץ מגיע. לחיצה פותחת בחירת קובץ
export default function UploadZone({ onFile, onPaste, onPick, busy, step }: { onFile: (f: File) => void; onPaste: () => void; onPick: () => void; busy: boolean; step: string }) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={`dropzone flex flex-col items-center justify-center gap-2 p-5 text-center ${over ? 'active' : ''}`}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
    >
      {busy ? (
        <p className="py-4 font-semibold text-navy" role="status">{step}...</p>
      ) : (
        <>
          <p className="text-lg font-light">{over ? 'עזבי כאן' : 'זרקי לכאן מסמך'}</p>
          <p className="text-sm text-mute">PDF, תמונה, אימייל או טקסט. הפרטים יחולצו לאישור שלך.</p>
          <div className="mt-2 flex gap-3">
            <button type="button" className="btn btn-primary" onClick={onPick}>בחירת קובץ</button>
            <button type="button" className="btn" onClick={onPaste}>הדבקת טקסט</button>
          </div>
        </>
      )}
    </div>
  )
}

// חלון הדבקת טקסט חופשי או אימייל
export function PasteDialog({ onSubmit, onClose }: { onSubmit: (t: string) => void; onClose: () => void }) {
  const [t, setT] = useState('')
  return (
    <Modal title="הדבקת טקסט" onClose={onClose}>
      <h2 className="text-2xl font-light">הדביקי טקסט או אימייל</h2>
      <p className="mb-4 mt-1 text-sm text-mute">הזמנה, הודעה או מייל. המערכת תחלץ ממנו תאריך, שעה, מקום ואנשים.</p>
      <textarea autoFocus rows={8} className="field resize-none" value={t} onChange={(e) => setT(e.target.value)} aria-label="הטקסט לחילוץ" />
      <div className="mt-5 flex gap-3">
        <button type="button" className="btn btn-primary min-w-32" disabled={t.trim().length < 5} onClick={() => onSubmit(t)}>חילוץ פרטים</button>
        <button type="button" className="btn min-w-32" onClick={onClose}>ביטול</button>
      </div>
    </Modal>
  )
}
