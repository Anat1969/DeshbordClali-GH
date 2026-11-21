import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon, { IconButton } from './Icon'
import { useApp } from '../lib/ctx'
import { guideFor, itemKey, markSeenGuide, markTried, potential, seenGuide, tried, type GuideItem } from '../lib/guide'

// "מה אפשר לעשות כאן": כפתור קבוע בסרגל העליון, באותו מקום בכל מסך.
// נפתח לבד בביקור הראשון בכל מסך. כל אפשרות שאפשר להפעיל היא כפתור, ומה שנוסה מסומן
export default function Guide() {
  const app = useApp()
  const nav = useNavigate()
  const path = useLocation().pathname
  const page = guideFor(path)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(tried)

  useEffect(() => {
    if (page && !seenGuide(path)) {
      setOpen(true)
      markSeenGuide(path)
    } else setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open])

  if (!page) return null
  const pot = potential()

  const run = (i: GuideItem) => {
    markTried(itemKey(path, i))
    setDone(tried())
    setOpen(false)
    if (i.ask !== undefined) nav('/work', { state: { ask: i.ask } })
    else if (i.to) nav(i.to)
    else if (i.act === 'file') app.pickFile()
    else if (i.act === 'paste') app.openPaste()
    else if (i.act === 'voice') app.openVoice()
    else if (i.act === 'manual') app.newManual()
  }

  return (
    <>
      <button
        type="button"
        className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[15px] transition-colors ${open ? 'bg-mark font-semibold' : 'bg-[#FFF8D6] hover:bg-mark'}`}
        aria-expanded={open}
        aria-label="מה אפשר לעשות כאן"
        title="מה אפשר לעשות כאן"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bulb" size={20} />
        <span className="hidden xl:inline">מה אפשר כאן</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 top-16 z-20 bg-[#1A2B4A]/15" onClick={() => setOpen(false)} aria-hidden="true" />
          <section role="dialog" aria-label={`מה אפשר לעשות: ${page.name}`} className="fixed inset-x-0 top-16 z-30 max-h-[calc(100dvh-5rem)] overflow-auto bg-white px-4 py-5 shadow-pop sm:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-light">מה אפשר לעשות: <b>{page.name}</b></h2>
                  <p className="m-0 mt-1 text-lg"><span className="marker">{page.why}</span></p>
                </div>
                <IconButton name="x" label="סגירה" onClick={() => setOpen(false)} />
              </div>

              <ol className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {page.items.map((i, n) => {
                  const live = !!(i.to || i.act || i.ask !== undefined)
                  const was = done.has(itemKey(path, i))
                  const body = (
                    <>
                      <span className="num w-5 shrink-0 text-sm text-mute">{n + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-[#111111]">{i.t}</span>
                        <span className="mt-0.5 block text-[15px] leading-relaxed">{i.d}</span>
                        {live && (
                          <span className={`mt-1.5 flex items-center gap-1 text-sm ${was ? 'text-good' : 'font-semibold text-navy'}`}>
                            <Icon name={was ? 'check' : 'chevronL'} size={14} />
                            {was ? 'ניסית. אפשר שוב' : i.ask !== undefined ? 'לנסות בשיחה' : i.to ? 'לעבור לשם' : 'לנסות עכשיו'}
                          </span>
                        )}
                      </span>
                    </>
                  )
                  return (
                    <li key={i.t}>
                      {live ? (
                        <button type="button" onClick={() => run(i)} className="flex h-full w-full items-start gap-2 rounded-lg bg-soft p-3 text-right shadow-btn transition-colors hover:bg-[#E9EBEF]">{body}</button>
                      ) : (
                        <div className="flex h-full items-start gap-2 p-3">{body}</div>
                      )}
                    </li>
                  )
                })}
              </ol>

              <p className="m-0 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-mute">
                <span>מסגרת אפורה: לחיצה מפעילה. בלי מסגרת: כבר נמצא במסך הזה.</span>
                <span>בכל האפליקציה ניסית <b className="num text-ink">{pot.done}</b> מתוך <b className="num text-ink">{pot.total}</b> אפשרויות.</span>
              </p>
            </div>
          </section>
        </>
      )}
    </>
  )
}
