import Icon from './Icon'
import type { useSpeech } from '../hooks/useSpeech'

// כפתור הקלטה: אייקון מיקרופון, ונקודה אדומה מהבהבת בזמן ההקלטה. טקסט חי ושגיאות בעברית מתחת
export default function VoiceButton({ speech, label = 'הקלטה ותמלול', className = '', withText = false }: { speech: ReturnType<typeof useSpeech>; label?: string; className?: string; withText?: boolean }) {
  if (!speech.supported) {
    return <p className={`text-sm text-mute ${className}`}>הקלטה זמינה ב-Chrome או ב-Edge. אפשר להשתמש בהקלדה הקולית של המערכת (ב-Windows: Win+H).</p>
  }
  return (
    <div className={className}>
      <button
        type="button"
        onClick={speech.toggle}
        aria-pressed={speech.listening}
        aria-label={speech.listening ? 'עצירת הקלטה' : label}
        title={speech.listening ? 'עצירת הקלטה' : label}
        className={`relative inline-flex h-9 items-center justify-center gap-2 rounded-lg transition-colors ${withText ? 'px-3' : 'w-9'} ${speech.listening ? 'bg-[#FBECEA] text-bad' : 'bg-soft text-ink hover:bg-[#E9EBEF]'}`}
      >
        <Icon name="mic" size={18} />
        {withText && <span className="text-sm">{speech.listening ? 'עצירה' : label}</span>}
        {speech.listening && <span className="rec-dot absolute -top-1 -end-1 h-2.5 w-2.5 rounded-full bg-bad" aria-hidden="true" />}
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
