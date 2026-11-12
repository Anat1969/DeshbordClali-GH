import { Link, useNavigate, useParams } from 'react-router-dom'
import { EventBody } from '../components/EventModal'
import { useApp } from '../lib/ctx'

// עמוד אירוע בודד (קישור ישיר)
export default function EventDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { ev } = useApp()
  const event = ev.events.find((e) => e.id === id)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/" className="mb-6 inline-block text-navy underline underline-offset-4">חזרה אל: היומן</Link>
      {ev.loading ? (
        <div className="skeleton h-40" />
      ) : event ? (
        <EventBody event={event} onDone={() => nav('/')} inPage />
      ) : (
        <p className="rounded-lg bg-soft p-4">האירוע לא נמצא. ייתכן שנמחק. אפשר לחזור ליומן.</p>
      )}
    </div>
  )
}
