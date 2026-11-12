import type { CalEvent } from '../types'
import { formatTime } from '../lib/dateUtils'
import { slotOf } from '../lib/categories'
import Icon from './Icon'
import { useApp } from '../lib/ctx'

// כרטיס אירוע ברשימת היום
export default function EventCard({ event, flash, onOpen }: { event: CalEvent; flash?: boolean; onOpen: () => void }) {
  const { cats } = useApp()
  const sl = slotOf(event.category)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`btn !h-auto w-full !items-stretch !justify-start gap-4 !py-3 text-right ${flash ? 'flash' : ''}`}
    >
      <span className="w-1.5 shrink-0 self-stretch rounded" style={{ background: sl?.color ?? '#C9CED8' }} aria-hidden="true" />
      <span className="num w-12 shrink-0 text-lg font-semibold text-navy">{formatTime(event.event_time) || '--:--'}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-semibold">{event.title}</span>
        {sl && <span className="block truncate text-sm font-semibold" style={{ color: sl.color === '#F2C514' ? '#8A6D00' : sl.color }}>{cats.names[sl.key] || sl.label}</span>}
        {event.location && <span className="mt-0.5 flex items-start gap-1.5 break-words text-sm text-mute"><Icon name="pin" size={14} className="mt-0.5 shrink-0" />{event.location}</span>}
        {event.people.length > 0 && <span className="mt-0.5 flex items-start gap-1.5 break-words text-sm text-mute"><Icon name="users" size={14} className="mt-0.5 shrink-0" />{event.people.join(', ')}</span>}
      </span>
    </button>
  )
}
