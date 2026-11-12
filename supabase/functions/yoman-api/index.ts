// שרת היומן: כל הגישה לנתונים עוברת כאן, מוגנת במפתח אישי (x-yoman-key).
// המפתח עצמו לא נשמר, רק ה-SHA-256 שלו (טבלת yoman_keys).
// secrets (לא חובה): ANTHROPIC_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yoman-key',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))

const COLS = 'id,title,event_date,event_time,location,people,description,raw_source,source_file_url,source_file_name,reminder_sent,created_at,updated_at'
const FIELDS = ['title', 'event_date', 'event_time', 'location', 'people', 'description', 'raw_source', 'source_file_url', 'source_file_name']

// רק שדות מותרים נכנסים לטבלה
function pick(src: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of FIELDS) if (f in src) out[f] = src[f]
  if ('event_time' in out && !out.event_time) out.event_time = null
  return out
}

const todayIL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())

const extractPrompt = () => `אתה מחלץ פרטי אירוע ממסמך.
החזר JSON בלבד, בלי הסבר ובלי גדרות קוד, בפורמט הזה:
{
  "title": "שם האירוע",
  "event_date": "YYYY-MM-DD" | null,
  "event_time": "HH:MM" | null,
  "location": "מיקום" | null,
  "people": ["שם1", "שם2"],
  "description": "תיאור קצר בעברית"
}
היום ${todayIL()}. תאריך בלי שנה הוא התאריך הקרוב הבא. אם אי אפשר לחלץ תאריך, event_date הוא null.
אל תמציא פרטים שלא כתובים במסמך.`

async function extract(b: { text?: string; mime?: string; data?: string }) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'no_anthropic_key' }, 503)
  const content: unknown[] = []
  if (typeof b.text === 'string' && b.text) {
    content.push({ type: 'text', text: `${extractPrompt()}\n\nטקסט לחילוץ:\n${b.text}` })
  } else if (b.mime === 'application/pdf') {
    content.push({ type: 'document', source: { type: 'base64', media_type: b.mime, data: b.data } }, { type: 'text', text: extractPrompt() })
  } else if (typeof b.mime === 'string' && b.mime.startsWith('image/')) {
    content.push({ type: 'image', source: { type: 'base64', media_type: b.mime, data: b.data } }, { type: 'text', text: extractPrompt() })
  } else return json({ error: 'bad_input' }, 400)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1024, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) return json({ error: 'extraction_failed', status: res.status }, 502)
  const out = await res.json()
  const raw: string = out.content?.find((c: { type: string }) => c.type === 'text')?.text ?? ''
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    return json({ ...parsed, raw_source: typeof b.text === 'string' ? b.text.slice(0, 4000) : null })
  } catch {
    return json({ error: 'unparsable' }, 502)
  }
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
    case 'ping':
      return json({ ok: true })

    case 'list': {
      const { data, error } = await sb.from('yoman_events').select(COLS).eq('owner_hash', owner).order('event_date').order('event_time', { nullsFirst: true })
      return error ? json({ error: error.message }, 500) : json({ events: data })
    }

    case 'create': {
      const row = pick(b.draft ?? {})
      if (!row.title || !row.event_date) return json({ error: 'missing_fields' }, 400)
      const { data, error } = await sb.from('yoman_events').insert({ ...row, owner_hash: owner }).select(COLS).single()
      return error ? json({ error: error.message }, 500) : json({ event: data })
    }

    case 'update': {
      const patch = pick(b.patch ?? {})
      const { data: prev } = await sb.from('yoman_events').select('event_date').eq('id', b.id).eq('owner_hash', owner).maybeSingle()
      if (!prev) return json({ error: 'not_found' }, 404)
      // שינוי תאריך מאפס את התזכורת, כדי שתישלח שוב ליום החדש
      const reset = patch.event_date && patch.event_date !== prev.event_date ? { reminder_sent: false } : {}
      const { data, error } = await sb.from('yoman_events').update({ ...patch, ...reset, updated_at: new Date().toISOString() }).eq('id', b.id).eq('owner_hash', owner).select(COLS).single()
      return error ? json({ error: error.message }, 500) : json({ event: data })
    }

    case 'delete': {
      const { error } = await sb.from('yoman_events').delete().eq('id', b.id).eq('owner_hash', owner)
      return error ? json({ error: error.message }, 500) : json({ ok: true })
    }

    case 'profile_get': {
      const { data } = await sb.from('yoman_profiles').select('whatsapp_number').eq('owner_hash', owner).maybeSingle()
      return json({ whatsapp_number: data?.whatsapp_number ?? '' })
    }

    case 'profile_set': {
      const n = String(b.whatsapp_number ?? '')
      if (n && !/^\+9725\d{8}$/.test(n)) return json({ error: 'bad_number' }, 400)
      const { error } = await sb.from('yoman_profiles').upsert({ owner_hash: owner, whatsapp_number: n })
      return error ? json({ error: error.message }, 500) : json({ ok: true })
    }

    case 'upload_url': {
      const safe = String(b.name ?? 'file').replace(/[^A-Za-z0-9._-]/g, '_').slice(-80)
      const path = `${owner.slice(0, 16)}/${Date.now()}_${safe}`
      const { data, error } = await sb.storage.from('yoman-documents').createSignedUploadUrl(path)
      return error ? json({ error: error.message }, 500) : json({ path, token: data.token })
    }

    case 'source_url': {
      // רק קובץ שמקושר לאירוע של הבעלים
      const { data: ev } = await sb.from('yoman_events').select('id').eq('owner_hash', owner).eq('source_file_url', b.path).limit(1).maybeSingle()
      if (!ev) return json({ error: 'not_found' }, 404)
      const { data } = await sb.storage.from('yoman-documents').createSignedUrl(b.path, 3600)
      return json({ url: data?.signedUrl ?? null })
    }

    case 'extract':
      return await extract(b)

    case 'rotate': {
      // מפתח חדש מחליף את הישן מיד, וכל הנתונים נשארים
      const fresh = hex(crypto.getRandomValues(new Uint8Array(24)).buffer)
      const { error } = await sb.from('yoman_keys').update({ key_hash: await sha256(fresh) }).eq('key_hash', owner)
      return error ? json({ error: error.message }, 500) : json({ key: fresh })
    }

    case 'test_send': {
      const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
      if (!sid) return json({ error: 'twilio_not_configured' }, 503)
      if (!/^\+9725\d{8}$/.test(b.to ?? '')) return json({ error: 'bad_number' }, 400)
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(`${sid}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: Deno.env.get('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886', To: `whatsapp:${b.to}`, Body: 'בדיקה מיומן חכם: תזכורות ווצאפ פועלות.' }),
      })
      return res.ok ? json({ ok: true }) : json({ error: 'twilio_error' }, 502)
    }

    default:
      return json({ error: 'unknown_action' }, 400)
  }
})
