import { Link } from 'react-router-dom'
import { loadAt, type Brief, type BriefItem } from '../lib/brief'

// תדרוך בוקר בשפת "מבט של 30 שניות": ציור היום כשטח, שלושה פרקים, ומתחת מה דורש תשומת לב ומה כבר סגור
const INK = '#2E2C27'
const SOFT = '#6B6A63'
const GREY = '#B4B3A8'
const CLAY = '#C6613F'
const SERIF = '"Frank Ruhl Libre","David Libre","Noto Serif Hebrew",Georgia,"Times New Roman",serif'

const W = 840
const H = 170
const X0 = 7
const X1 = 22
// עברית: הזמן זורם מימין לשמאל, כמו העמודות שמתחת (הבוקר מימין)
const xOf = (h: number) => W - ((h - X0) / (X1 - X0)) * W
const BASE = 138

// משרטט מסלול חלק דרך נקודות (Catmull-Rom לקימורים)
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}, ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

function Terrain({ brief }: { brief: Brief }) {
  const scale = brief.dayType === 'heavy' ? 40 : brief.dayType === 'normal' ? 34 : 28
  // עומס לכל רבע שעה, ואז החלקה
  const raw: number[] = []
  for (let h = X0; h <= X1; h += 0.25) raw.push(Math.min(loadAt(brief.dots, h), 4))
  const sm = raw.map((_, i) => (raw[i - 2] ?? raw[i]) * 0.1 + (raw[i - 1] ?? raw[i]) * 0.2 + raw[i] * 0.4 + (raw[i + 1] ?? raw[i]) * 0.2 + (raw[i + 2] ?? raw[i]) * 0.1)
  const pts = sm.map((v, i) => [xOf(X0 + i * 0.25), BASE - v * scale] as [number, number])
  const yAt = (h: number) => {
    const i = Math.max(0, Math.min(sm.length - 1, Math.round((h - X0) / 0.25)))
    return pts[i][1]
  }
  const busiest = brief.dots.length ? brief.dots.reduce((a, b) => (loadAt(brief.dots, b.t) > loadAt(brief.dots, a.t) ? b : a)) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="צורת היום: העומס לאורך השעות, כשכל נקודה היא אירוע">
      <path d={smooth(pts)} fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      {/* אירועים: נקודה על הקו. חפיפה: שני עיגולים חלולים שנחתכים */}
      {brief.dots.map((d, i) =>
        d.overlap ? (
          <g key={i}>
            <circle cx={xOf(d.t) - 6} cy={yAt(d.t)} r="9" fill="#FCFCFB" stroke={INK} strokeWidth="2" />
            <circle cx={xOf(d.t) + 6} cy={yAt(d.t)} r="9" fill="#FCFCFB" stroke={INK} strokeWidth="2" />
          </g>
        ) : (
          <circle key={i} cx={xOf(d.t)} cy={yAt(d.t)} r="8" fill={INK} />
        ),
      )}
      {/* הדגשה אחת בחימר: שמש מעל החלון הפנוי הארוך, ואם אין חלון, קו מתח מתחת לשעה העמוסה */}
      {brief.free ? (
        <g stroke={CLAY} strokeWidth="2" strokeLinecap="round" fill="none">
          <circle cx={xOf((brief.free.from + brief.free.to) / 2)} cy="38" r="10" />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4
            const cx = xOf((brief.free!.from + brief.free!.to) / 2)
            return <line key={k} x1={cx + Math.cos(a) * 15} y1={38 + Math.sin(a) * 15} x2={cx + Math.cos(a) * 20} y2={38 + Math.sin(a) * 20} />
          })}
        </g>
      ) : busiest ? (
        <path d={`M ${xOf(busiest.t) - 24} ${yAt(busiest.t) + 22} q 6 -8 12 0 t 12 0 t 12 0 t 12 0`} fill="none" stroke={CLAY} strokeWidth="2" strokeLinecap="round" />
      ) : null}
    </svg>
  )
}

function Items({ title, items }: { title: string; items: BriefItem[] }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-base font-semibold" style={{ color: INK }}>{title}</h2>
      <ol className="m-0 grid list-none gap-4 p-0">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="num w-5 shrink-0 text-sm" style={{ color: GREY }}>{i + 1}</span>
            <div className="min-w-0">
              <p className="m-0 break-words font-semibold" style={{ color: INK }}>
                {it.to ? <Link to={it.to} className="hover:underline">{it.title}</Link> : it.title}
              </p>
              <p className="m-0 mt-0.5 break-words text-[15px] leading-relaxed" style={{ color: SOFT }}>{it.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function MorningBrief({ brief, dateLine, children }: { brief: Brief; dateLine: string; children?: React.ReactNode }) {
  return (
    <>
      {/* הרצועה העליונה: תאריך, כותרת, ציור היום ושלושה פרקים */}
      <section className="w-full px-4 py-8 sm:px-8 sm:py-10" style={{ background: '#F9F9F7', borderBottom: '1px solid #E1E1DF' }} aria-label="תדרוך בוקר">
        <div className="mx-auto max-w-[860px]">
          <div className="flex items-start justify-between gap-4">
            <p className="m-0 text-sm" style={{ color: SOFT }}>{dateLine}</p>
            {children}
          </div>
          <h1 className="m-0 mt-2 text-[30px] font-semibold leading-snug sm:text-[40px]" style={{ color: INK, fontFamily: SERIF }}>{brief.headline}</h1>
          <div className="mt-5"><Terrain brief={brief} /></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {brief.acts.map((a, i) => (
              <div key={i} className={`min-w-0 py-1 sm:px-4 sm:first:ps-0 sm:last:pe-0 ${i ? 'max-sm:border-t max-sm:pt-4 sm:border-s' : ''} border-[#E4E3DC]`}>
                <p className="m-0 text-sm font-bold" style={{ color: INK }}>{a.range}</p>
                <p className="m-0 mt-1 break-words text-[15px] leading-relaxed" style={{ color: SOFT }}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* הרצועה התחתונה: מה דורש תשומת לב, ומה כבר סגור */}
      <section className="w-full px-4 py-8 sm:px-8 sm:py-10" style={{ background: '#FCFCFB' }} aria-label="מה חשוב הבוקר">
        <div className="mx-auto grid max-w-[860px] gap-8">
          {brief.needs.length === 0 && brief.resolved.length === 0 ? (
            <p className="m-0 text-lg" style={{ color: SOFT }}>אין מה שדורש אותך הבוקר.</p>
          ) : (
            <>
              {brief.needs.length > 0 ? <Items title="דורש תשומת לב" items={brief.needs} /> : <p className="m-0" style={{ color: SOFT }}>אין מה שדורש אותך הבוקר.</p>}
              {brief.resolved.length > 0 && <Items title="כבר סגור" items={brief.resolved} />}
            </>
          )}
        </div>
      </section>
    </>
  )
}
