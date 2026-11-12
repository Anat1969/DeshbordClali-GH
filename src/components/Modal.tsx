import { useEffect } from 'react'

// חלון מעל המסך: Escape וקליק על הרקע סוגרים. בנייד נפתח מלמטה
export default function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(26,43,74,.35)] sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92dvh] w-full overflow-auto rounded-t-2xl bg-white p-5 shadow-pop sm:rounded-2xl sm:p-7 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        {children}
      </div>
    </div>
  )
}
