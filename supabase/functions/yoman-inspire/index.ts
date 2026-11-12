// השראה ליום: כרטיסים מהאפליקציות האחרות בפרויקט. הבחירה קבועה לכל היום (לפי התאריך בישראל).
// קורא רק טבלאות תוכן ציבוריות (לא טיפול, קבלות, לקוחות). אותו מפתח אישי כמו yoman-api
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yoman-key',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())
// מספר היום: קובע איזה פריט נבחר, ולכן נשאר זהה כל היום
const seed = Math.floor(Date.parse(today) / 86400000)

// קיצור בגבול מילה
function clip(t: unknown, n: number): string {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim()
  if (s.length <= n) return s
  const cut = s.slice(0, n)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 30)).trim() + '…'
}

type Sb = ReturnType<typeof createClient>
type Card = Record<string, unknown>

// בוחר שורה אחת לפי היום: ספירה, ואז טווח של שורה אחת
// deno-lint-ignore no-explicit-any
async function pick(sb: Sb, table: string, cols: string, order: string, filter: (q: any) => any, salt: number) {
  const { count } = await filter(sb.from(table).select('id', { count: 'exact', head: true }))
  if (!count) return null
  const i = (seed * 7 + salt) % count
  const { data } = await filter(sb.from(table).select(cols)).order(order).range(i, i)
  return data?.[0] ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const key = req.headers.get('x-yoman-key') ?? ''
  if (key.length < 20) return json({ error: 'unauthorized' }, 401)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: k } = await sb.from('yoman_keys').select('key_hash').eq('key_hash', await sha256(key)).maybeSingle()
  if (!k) return json({ error: 'unauthorized' }, 401)

  const tasks: Promise<Card | null>[] = [
    // משפט העצמה: פתגם מתוך מאמרי התרבות
    pick(sb, 'culture_articles', 'concept,proverb', 'id', (q) => q.not('proverb', 'is', null).neq('proverb', ''), 1).then((r) =>
      r ? { id: 'power', kind: 'power', label: 'משפט העצמה', title: r.concept, text: clip(r.proverb, 220), source: 'CULTURA' } : null),
    // תובנת ידע
    pick(sb, 'culture_articles', 'concept,lede,insight', 'id', (q) => q.not('insight', 'is', null), 4).then((r) =>
      r ? { id: 'insight', kind: 'insight', label: 'תובנת ידע', title: r.concept, text: clip(r.lede || r.insight, 380), source: 'CULTURA' } : null),
    // אימון: שאלה עם תשובות (בלי שאלות שדורשות תמונה)
    pick(sb, 'dapar_questions', 'prompt,instruction_text,options,correct_index,explanation', 'id', (q) => q.is('figure', null).not('options', 'is', null), 2).then((r) => {
      if (!r || !Array.isArray(r.options)) return null
      // deno-lint-ignore no-explicit-any
      const options = r.options.map((o: any) => (typeof o === 'string' ? o : String(o?.text ?? o?.label ?? ''))).filter(Boolean)
      if (options.length < 2 || typeof r.correct_index !== 'number') return null
      return { id: 'train', kind: 'train', label: 'אימון', text: clip(r.prompt, 240), hint: clip(r.instruction_text, 160), options, correct: r.correct_index, explanation: clip(r.explanation, 300), source: 'DAPAR' }
    }),
    // תרגיל להיום
    pick(sb, 'mahut_articles', 'title,pragmatic_action', 'id', (q) => q.eq('published', true).not('pragmatic_action', 'is', null).neq('pragmatic_action', ''), 3).then((r) =>
      r ? { id: 'exercise', kind: 'exercise', label: 'תרגיל להיום', title: r.title, text: clip(r.pragmatic_action, 360), source: 'המהות' } : null),
    // אקטואליה: סיכום אחרון מהרדאר
    (async () => {
      const { data: latest } = await sb.from('radar_digests').select('date').order('date', { ascending: false }).limit(1)
      const date = latest?.[0]?.date
      if (!date) return null
      const r = await pick(sb, 'radar_digests', 'headline,summary,topic_id,date', 'id', (q) => q.eq('date', date), 5)
      if (!r) return null
      const { data: t } = await sb.from('radar_topics').select('keyword').eq('id', r.topic_id).maybeSingle()
      return { id: 'news', kind: 'news', label: 'אקטואליה', title: r.headline, text: clip(r.summary, 380), meta: [t?.keyword, r.date].filter(Boolean).join(' · '), source: 'RADAR' }
    })(),
    // שיר: קישור לאפליקציית "שיר ביום"
    (async () => {
      const { data } = await sb.from('aoa_apps').select('data').filter('data->>name', 'eq', 'שיר ביום').limit(1)
      const url = data?.[0]?.data?.previewUrl ?? data?.[0]?.data?.vercelUrl ?? null
      return url ? { id: 'song', kind: 'song', label: 'שיר להיום', text: 'השיר של היום מחכה לך באפליקציית שיר ביום.', url, source: 'שיר ביום' } : null
    })(),
    // רעיון מזוקק
    pick(sb, 'zikuk_dnas', 'title,distillation,essence', 'id', (q) => q.eq('published', true).not('distillation', 'is', null), 6).then((r) =>
      r ? { id: 'distilled', kind: 'distilled', label: 'רעיון מזוקק', title: r.title, text: clip(r.distillation, 240), meta: clip(r.essence, 220), source: 'ZIKUK' } : null),
    // מילה להרהור
    pick(sb, 'faces_words', 'text', 'id', (q) => q, 8).then((r) =>
      r ? { id: 'word', kind: 'word', label: 'מילה להרהור', title: r.text, text: 'מה המילה הזו אומרת לך היום?', source: 'FACES' } : null),
  ]

  const settled = await Promise.allSettled(tasks)
  const cards = settled.flatMap((s) => (s.status === 'fulfilled' && s.value ? [s.value] : []))
  return json({ date: today, cards })
})
