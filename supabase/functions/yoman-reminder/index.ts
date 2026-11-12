// תזכורת ווצאפ יומית, 08:00 שעון ישראל. נקראת מ-cron (ראו docs/flow.md)
// secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, CRON_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2'

// מחר לפי שעון ישראל (לא UTC), כדי שהתאריך לא יזוז סביב חצות
function tomorrowIL(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' })
  const t = new Date(Date.now() + 24 * 3600 * 1000)
  return fmt.format(t)
}

function buildMessage(e: { title: string; event_time: string | null; location: string | null; people: string[] | null }): string {
  const time = e.event_time ? ` בשעה ${e.event_time.slice(0, 5)}` : ''
  const loc = e.location ? `\nמיקום: ${e.location}` : ''
  const ppl = e.people?.length ? `\nעם: ${e.people.join(', ')}` : ''
  return `מחר: ${e.title}${time}${loc}${ppl}`
}

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: Deno.env.get('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886', To: `whatsapp:${to}`, Body: body }),
  })
  return res.ok
}

Deno.serve(async (req) => {
  // הגנה: רק ה-cron (עם הסוד) יכול להפעיל
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 })

  // רצים פעמיים ביום (05:00 ו-06:00 UTC) ושולחים רק כששעון ישראל הוא 08, כדי לכסות שעון קיץ וחורף
  const hourIL = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }).format(new Date()))
  if (hourIL !== 8 && new URL(req.url).searchParams.get('force') !== '1') return new Response(JSON.stringify({ skipped: true, hourIL }))

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: events, error } = await supabase
    .from('yoman_events')
    .select('id,owner_hash,title,event_time,location,people')
    .eq('event_date', tomorrowIL())
    .eq('reminder_sent', false)
  if (error) return new Response(error.message, { status: 500 })

  let sent = 0
  for (const e of events ?? []) {
    const { data: p } = await supabase.from('yoman_profiles').select('whatsapp_number').eq('owner_hash', e.owner_hash).maybeSingle()
    if (!p?.whatsapp_number) continue // אין מספר: מדלגים, והתזכורת תישלח כשיוגדר
    // מסמנים כנשלח רק אם Twilio אישר, כדי שכישלון ינוסה שוב
    if (await sendWhatsApp(p.whatsapp_number, buildMessage(e))) {
      await supabase.from('yoman_events').update({ reminder_sent: true }).eq('id', e.id)
      sent++
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})
