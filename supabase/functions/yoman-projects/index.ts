// מעקב פרויקטים: רשימה, הוספה, עדכון ומחיקה, כולל אבני דרך (תאריכים שמופיעים ביומן). אותו מפתח אישי כמו yoman-api
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yoman-key',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
const str = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n)

const COLS = 'id,name,status,progress,next_step,due_date,note,milestones,created_at,updated_at'
const STATUSES = ['planning', 'active', 'waiting', 'done']
const DATE = /^\d{4}-\d{2}-\d{2}$/

// רק שדות מותרים, עם בדיקה לכל שדה. אבן דרך חייבת שם ותאריך
function pick(p: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if ('name' in p && str(p.name, 120)) out.name = str(p.name, 120)
  if ('status' in p && STATUSES.includes(p.status)) out.status = p.status
  if ('progress' in p) out.progress = Math.max(0, Math.min(100, Math.round(Number(p.progress) || 0)))
  if ('next_step' in p) out.next_step = str(p.next_step, 300) || null
  if ('due_date' in p) out.due_date = DATE.test(str(p.due_date, 10)) ? str(p.due_date, 10) : null
  if ('note' in p) out.note = str(p.note, 2000) || null
  if ('milestones' in p) {
    out.milestones = (Array.isArray(p.milestones) ? p.milestones : []).slice(0, 40)
      .map((m: any) => ({ id: str(m?.id, 40) || crypto.randomUUID(), name: str(m?.name, 120), date: str(m?.date, 10), done: m?.done === true }))
      .filter((m: { name: string; date: string }) => m.name && DATE.test(m.date))
      .sort((a: { date: string }, b: { date: string }) => (a.date < b.date ? -1 : 1))
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const key = req.headers.get('x-yoman-key') ?? ''
  if (key.length < 20) return json({ error: 'unauthorized' }, 401)
  const owner = await sha256(key)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: k } = await sb.from('yoman_keys').select('key_hash').eq('key_hash', owner).maybeSingle()
  if (!k) return json({ error: 'unauthorized' }, 401)

  let b: Record<string, any>
  try { b = await req.json() } catch { return json({ error: 'bad_json' }, 400) }

  switch (b.action) {
    case 'list': {
      const { data, error } = await sb.from('yoman_projects').select(COLS).eq('owner_hash', owner).order('created_at', { ascending: false }).limit(300)
      return error ? json({ error: error.message }, 500) : json({ projects: data })
    }

    case 'create': {
      const row = pick(b.draft ?? {})
      if (!row.name) return json({ error: 'missing_name' }, 400)
      const { data, error } = await sb.from('yoman_projects').insert({ ...row, owner_hash: owner }).select(COLS).single()
      return error ? json({ error: error.message }, 500) : json({ project: data })
    }

    case 'update': {
      const patch = pick(b.patch ?? {})
      const { data, error } = await sb.from('yoman_projects').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', b.id).eq('owner_hash', owner).select(COLS).single()
      return error ? json({ error: error.message }, 500) : json({ project: data })
    }

    case 'delete': {
      const { error } = await sb.from('yoman_projects').delete().eq('id', b.id).eq('owner_hash', owner)
      return error ? json({ error: error.message }, 500) : json({ ok: true })
    }

    default:
      return json({ error: 'unknown_action' }, 400)
  }
})
