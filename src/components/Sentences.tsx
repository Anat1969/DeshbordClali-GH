import { sentences } from '../lib/text'

// טקסט מובנה: כל משפט בשורה משלו. עם numbered, המשפטים ממוספרים (רק כשיש יותר ממשפט אחד)
export default function Sentences({ text, numbered, className = '' }: { text: string; numbered?: boolean; className?: string }) {
  const list = sentences(text)
  if (list.length <= 1) return <p className={`m-0 break-words ${className}`}>{text}</p>
  if (numbered) {
    return (
      <ol className={`m-0 grid list-none gap-1.5 p-0 ${className}`}>
        {list.map((s, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="num w-5 shrink-0 text-sm font-semibold text-mute">{i + 1}</span>
            <span className="min-w-0 break-words">{s}</span>
          </li>
        ))}
      </ol>
    )
  }
  return <div className={`grid gap-1 ${className}`}>{list.map((s, i) => <p key={i} className="m-0 break-words">{s}</p>)}</div>
}
