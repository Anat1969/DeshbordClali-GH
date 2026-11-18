// דוח לילי "שדרוג אפליקציות": קריאה בלבד. אותו מפתח אישי כמו yoman-api. הכתיבה נעשית מהמשימה הלילית ישירות במסד
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yoman-key',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const key = req.headers.get('x-yoman-key') ?? ''
  if (key.length < 20) return json({ error: 'unauthorized' }, 401)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: k } = await sb.from('yoman_keys').select('key_hash').eq('key_hash', await sha256(key)).maybeSingle()
  if (!k) return json({ error: 'unauthorized' }, 401)

  let b: Record<string, unknown>
  try { b = await req.json() } catch { return json({ error: 'bad_json' }, 400) }
  if (b.action !== 'list') return json({ error: 'unknown_action' }, 400)

  const { data, error } = await sb.from('yoman_app_reports').select('*').order('report_date', { ascending: false }).limit(60)
  return error ? json({ error: error.message }, 500) : json({ reports: data })
})
