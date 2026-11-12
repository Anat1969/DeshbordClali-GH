// חילוץ פרטי אירוע ממסמך באמצעות Claude. המפתח נשאר בשרת
// secrets: ANTHROPIC_API_KEY
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const todayIL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())

const prompt = () => `אתה מחלץ פרטי אירוע ממסמך.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // רק משתמשת מחוברת
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return json({ error: 'unauthorized' }, 401)

  const { text, mime, data } = await req.json()

  const content: unknown[] = []
  if (typeof text === 'string' && text) {
    content.push({ type: 'text', text: `${prompt()}\n\nטקסט לחילוץ:\n${text}` })
  } else if (mime === 'application/pdf') {
    content.push({ type: 'document', source: { type: 'base64', media_type: mime, data } }, { type: 'text', text: prompt() })
  } else if (typeof mime === 'string' && mime.startsWith('image/')) {
    content.push({ type: 'image', source: { type: 'base64', media_type: mime, data } }, { type: 'text', text: prompt() })
  } else {
    return json({ error: 'bad input' }, 400)
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1024, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) return json({ error: 'extraction failed' }, 502)

  const out = await res.json()
  const raw: string = out.content?.find((c: { type: string }) => c.type === 'text')?.text ?? ''
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    return json({ ...parsed, raw_source: typeof text === 'string' ? text.slice(0, 4000) : null })
  } catch {
    return json({ error: 'unparsable' }, 502)
  }
})
