// משימות: רשימה, הוספה, עדכון (בוצע, הערה, טקסט) ומחיקה. אותו מפתח אישי כמו yoman-api
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yoman-key',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))

const COLS = 'id,text,note,done,done_at,created_at'

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
      const { data, error } = await sb.from('yoman_tasks').select(COLS).eq('owner_hash', owner).order('created_at', { ascending: false }).limit(500)
      return error ? json({ error: error.message }, 500) : json({ tasks: data })
    }

    case 'create': {
      const text = String(b.text ?? '').trim().slice(0, 500)
      if (!text) return json({ error: 'missing_text' }, 400)
      const { data, error } = await sb.from('yoman_tasks').insert({ owner_hash: owner, text }).select(COLS).single()
      return error ? json({ error: error.message }, 500) : json({ task: data })
    }

    case 'update': {
      const p = b.patch ?? {}
      const patch: Record<string, unknown> = {}
      if (typeof p.text === 'string' && p.text.trim()) patch.text = p.text.trim().slice(0, 500)
      if ('note' in p) patch.note = p.note ? String(p.note).slice(0, 2000) : null
      if (typeof p.done === 'boolean') {
        patch.done = p.done
        patch.done_at = p.done ? new Date().toISOString() : null
      }
      const { data, error } = await sb.from('yoman_tasks').update(patch).eq('id', b.id).eq('owner_hash', owner).select(COLS).single()
      return error ? json({ error: error.message }, 500) : json({ task: data })
    }

    case 'delete': {
      const { error } = await sb.from('yoman_tasks').delete().eq('id', b.id).eq('owner_hash', owner)
      return error ? json({ error: error.message }, 500) : json({ ok: true })
    }

    default:
      return json({ error: 'unknown_action' }, 400)
  }
})
