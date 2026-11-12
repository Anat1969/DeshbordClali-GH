// הודעת בדיקה לווצאפ מהגדרות. secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return new Response('unauthorized', { status: 401, headers: cors })

  const { to } = await req.json()
  if (!/^\+9725\d{8}$/.test(to ?? '')) return new Response('bad number', { status: 400, headers: cors })

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${sid}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: Deno.env.get('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886', To: `whatsapp:${to}`, Body: 'בדיקה מיומן חכם: תזכורות ווצאפ פועלות.' }),
  })
  return new Response(res.ok ? 'ok' : 'twilio error', { status: res.ok ? 200 : 502, headers: cors })
})
