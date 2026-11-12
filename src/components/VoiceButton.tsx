import Icon from './Icon'
import type { useSpeech } from '../hooks/useSpeech'

// כפתור הקלטה עם חיווי: מקליט, טקסט חי, שגיאה בעברית, או "לא נתמך"
export default function VoiceButton({ speech, label = 'הקלטה ותמלול', className = '' }: { speech: ReturnType<typeof useSpeech>; label?: string; className?: string }) {
  if (!speech.supported) {
    return <p className={`text-sm text-mute ${className}`}>הקלטה זמינה ב-Chrome או ב-Edge. אפשר להשתמש בהקלדה הקולית של המערכת (ב-Windows: Win+H).</p>
  }
  return (
    <div className={className}>
      <button
        type="button"
        onClick={speech.toggle}
        aria-pressed={speech.listening}
        className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors ${speech.listening ? 'bg-bad text-white' : 'bg-soft text-ink hover:bg-[#E9EBEF]'}`}
      >
        <Icon name={speech.listening ? 'stop' : 'mic'} size={16} />
        {speech.listening ? 'עצירת הקלטה' : label}
      </button>
      {speech.listening && (
        <p className="mt-1.5 text-sm text-bad" role="status">
          מקליטה, דברי עכשיו.{speech.interim && <span className="text-ink"> {speech.interim}</span>}
        </p>
      )}
      {speech.error && <p className="mt-1.5 text-sm text-bad" role="alert">{speech.error}</p>}
    </div>
  )
}
