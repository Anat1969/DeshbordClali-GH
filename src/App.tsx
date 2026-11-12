import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import TopBar from './components/TopBar'
import ExtractionReview from './components/ExtractionReview'
import { PasteDialog } from './components/UploadZone'
import { formatLong } from './lib/dateUtils'
import Home from './pages/Home'
import EventDetail from './pages/EventDetail'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { Ctx } from './lib/ctx'
import { useAccess } from './hooks/useAccess'
import { useEvents } from './hooks/useEvents'
import { useUpload } from './hooks/useUpload'
import { useCategories } from './hooks/useCategories'
import { demoMode } from './lib/supabase'

export default function App() {
  const access = useAccess()
  const authed = access.allowed
  const ev = useEvents(authed)
  const cats = useCategories(authed)
  const up = useUpload(cats.names)
  const fileInput = useRef<HTMLInputElement>(null)
  const [paste, setPaste] = useState<false | 'text' | 'voice'>(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const toast = useCallback((m: string) => {
    setToastMsg(m)
    window.setTimeout(() => setToastMsg(null), 3200)
  }, [])

  // הדבקה מהלוח (Ctrl+V) מחוץ לשדות טקסט פותחת חילוץ ישירות
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const file = e.clipboardData?.files[0]
      const text = e.clipboardData?.getData('text')
      if (file) up.fromFile(file)
      else if (text && text.trim().length > 5) up.fromText(text)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  if (!authed) return <Login onEnter={access.enter} />

  const saveDraft = async (d: Parameters<typeof ev.add>[0]) => {
    await ev.add(d)
    up.reset()
    toast('נשמר ביומן')
  }

  return (
    <BrowserRouter>
      <Ctx.Provider
        value={{
          ev,
          cats,
          pickFile: () => fileInput.current?.click(),
          openPaste: () => setPaste('text'),
          openVoice: () => setPaste('voice'),
          newManual: (date?: string) => up.manual(date),
          fromFile: up.fromFile,
          signOut: access.leave,
          account: demoMode ? null : 'מפתח אישי',
          toast,
        }}
      >
        <div className="flex h-dvh flex-col">
          <TopBar />
          <main className="flex min-h-0 flex-1 flex-col overflow-auto">
            <Routes>
              <Route path="/" element={<Home uploading={up.stage === 'working'} step={up.step} />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<p className="p-8">הדף לא נמצא. אפשר לחזור ליומן דרך שם האפליקציה למעלה.</p>} />
            </Routes>
          </main>
        </div>

        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".pdf,.txt,.eml,.md,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) up.fromFile(f)
            e.target.value = ''
          }}
        />
        {paste && <PasteDialog voice={paste === 'voice'} onClose={() => setPaste(false)} onSubmit={(t) => (setPaste(false), up.fromText(t))} />}
        {up.stage === 'review' && up.draft && <ExtractionReview draft={up.draft} manual={up.draft.raw_source === null && !up.draft.source_file_name} dateNote={up.draft.event_date && up.draft.raw_source === null && !up.draft.source_file_name ? formatLong(up.draft.event_date) : null} onSave={saveDraft} onCancel={up.reset} />}
        {up.stage === 'error' && (
          <div className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg bg-white p-4 shadow-pop" role="alert">
            <span className="text-bad">{up.error}</span>
            <span className="flex gap-2">
              <button type="button" className="btn" onClick={() => up.manual()}>מילוי ידני</button>
              <button type="button" className="btn" onClick={up.reset}>סגירה</button>
            </span>
          </div>
        )}
        {toastMsg && (
          <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-navy px-5 py-3 text-white shadow-pop">{toastMsg}</div>
        )}
      </Ctx.Provider>
    </BrowserRouter>
  )
}
