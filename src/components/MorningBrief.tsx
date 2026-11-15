import { Link } from 'react-router-dom'
import DocLink from './DocLink'
import Clock from './Clock'
import Sentences from './Sentences'
import { loadAt, type Brief, type BriefItem } from '../lib/brief'

// תדרוך בוקר בשפת "מבט של 30 שניות": ציור היום כשטח, שלושה פרקים, ומתחת מה דורש תשומת לב ומה כבר סגור
const INK = '#2E2C27'
const SOFT = '#6B6A63'
const GREY = '#B4B3A8'
const CLAY = '#C6613F'

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
      <path d={smooth(pts)} pathLength={1} className="draw" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      {/* אירועים: נקודה על הקו. חפיפה: שני עיגולים חלולים שנחתכים */}
      {brief.dots.map((d, i) =>
        d.overlap ? (
          <g key={i} className="pop" style={{ '--d': `${700 + i * 160}ms` } as React.CSSProperties}>
            <circle cx={xOf(d.t) - 6} cy={yAt(d.t)} r="9" fill="#FCFCFB" stroke={INK} strokeWidth="2" />
            <circle cx={xOf(d.t) + 6} cy={yAt(d.t)} r="9" fill="#FCFCFB" stroke={INK} strokeWidth="2" />
          </g>
        ) : (
          <circle key={i} className="pop" style={{ '--d': `${700 + i * 160}ms` } as React.CSSProperties} cx={xOf(d.t)} cy={yAt(d.t)} r="8" fill={INK} />
        ),
      )}
      {/* הדגשה אחת בחימר: שמש מעל החלון הפנוי הארוך, ואם אין חלון, קו מתח מתחת לשעה העמוסה */}
      {brief.free ? (
        <g stroke={CLAY} strokeWidth="2" strokeLinecap="round" fill="none" className="spin-slow">
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

function Items({ title, items, important }: { title: string; items: BriefItem[]; important?: boolean }) {
  return (
    <section aria-label={title}>
      <h2 className="hand mb-4 text-4xl" style={{ color: INK }}><span className={important ? 'marker-lg' : ''}>{title}</span></h2>
      <ol className="m-0 grid list-none gap-4 p-0">
        {items.map((it, i) => (
          <li key={i} className="rise flex items-start gap-3" style={{ '--d': `${i * 90}ms` } as React.CSSProperties}>
            <span className="num w-6 shrink-0 text-lg font-semibold" style={{ color: important ? CLAY : GREY }}>{i + 1}.</span>
            <div className="min-w-0">
              <p className="hand m-0 break-words text-3xl" style={{ color: INK }}>
                <span className={important ? 'marker' : ''}>{it.to ? <Link to={it.to} className="hover:underline">{it.title}</Link> : it.title}</span>
              </p>
              <Sentences text={it.text} className="mt-1 text-[17px] leading-relaxed" />
              {/* מסמכי המשימה, בגדול, כדי שיהיה חומר לבצע אותה */}
              {it.docs && it.docs.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2" aria-label="מסמכי המשימה">
                  {it.docs.map((d) => <DocLink key={d.doc.id} taskId={d.taskId} doc={d.doc} big />)}
                </div>
              )}
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
      <section className="w-full bg-white px-4 py-8 sm:px-8 sm:py-10" style={{ borderBottom: '1px solid #E1E1DF' }} aria-label="תדרוך בוקר">
        <div className="mx-auto max-w-[860px]">
          <div className="flex items-start justify-between gap-4">
            <p className="m-0 text-xl font-semibold" style={{ color: SOFT }}>{dateLine}</p>
            {children}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <h1 className="rise m-0 min-w-0 flex-1 basis-72 text-[34px] font-semibold leading-snug sm:text-[48px]" style={{ color: INK, fontFamily: '"Gveret Levin", Heebo, cursive', fontWeight: 400 }}>{brief.headline}</h1>
            <div className="rise" style={{ '--d': '250ms' } as React.CSSProperties}><Clock size={176} /></div>
          </div>
          <div className="mt-5"><Terrain brief={brief} /></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {brief.acts.map((a, i) => (
              <div key={i} className={`rise min-w-0 py-1 sm:px-4 sm:first:ps-0 sm:last:pe-0 ${i ? 'max-sm:border-t max-sm:pt-4 sm:border-s' : ''} border-[#E4E3DC]`} style={{ '--d': `${900 + i * 150}ms` } as React.CSSProperties}>
                <p className="num m-0 text-2xl font-semibold" style={{ color: INK }}><span className="marker">{a.range}</span></p>
                <Sentences text={a.text} className="mt-1.5 text-[17px] leading-relaxed" />
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
              {brief.needs.length > 0 ? <Items title="דורש תשומת לב" items={brief.needs} important /> : <p className="m-0" style={{ color: SOFT }}>אין מה שדורש אותך הבוקר.</p>}
              {brief.resolved.length > 0 && <Items title="כבר סגור" items={brief.resolved} />}
            </>
          )}
        </div>
      </section>
    </>
  )
}
