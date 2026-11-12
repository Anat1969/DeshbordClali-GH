import type { CalEvent } from '../types'
import { formatTime } from '../lib/dateUtils'

// כרטיס אירוע ברשימת היום
export default function EventCard({ event, flash, onOpen }: { event: CalEvent; flash?: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`btn !h-auto w-full !items-stretch !justify-start gap-4 !py-3 text-right ${flash ? 'flash' : ''}`}
    >
      <span className="num w-12 shrink-0 text-lg font-semibold text-navy">{formatTime(event.event_time) || '--:--'}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{event.title}</span>
        {event.location && <span className="block truncate text-sm text-mute">{event.location}</span>}
        {event.people.length > 0 && <span className="block truncate text-sm text-mute">{event.people.join(', ')}</span>}
      </span>
    </button>
  )
}
