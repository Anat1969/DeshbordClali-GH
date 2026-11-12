// משימות: רשימה, הוספה, עדכון (בוצע, הערה, טקסט), מחיקה, ומסמכים לכל משימה (קבצים וקישורים).
// אותו מפתח אישי כמו yoman-api
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yoman-key',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))

const COLS = 'id,text,note,done,done_at,created_at,docs'
const BUCKET = 'yoman-documents'

type Doc = { id: string; kind: 'file' | 'link'; name: string; url?: string; path?: string; size?: number }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const key = req.headers.get('x-yoman-key') ?? ''
  if (key.length < 20) return json({ error: 'unauthorized' }, 401)
  const owner = await sha256(key)
  // קבצי משימות נשמרים תחת תיקייה של הבעלים, וכך אי אפשר להצביע על קובץ של מישהו אחר
  const prefix = `${owner.slice(0, 16)}/tasks/`

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: k } = await sb.from('yoman_keys').select('key_hash').eq('key_hash', owner).maybeSingle()
  if (!k) return json({ error: 'unauthorized' }, 401)

  let b: Record<string, any>
  try { b = await req.json() } catch { return json({ error: 'bad_json' }, 400) }

  const getTask = async (id: unknown) => (await sb.from('yoman_tasks').select(COLS).eq('id', id).eq('owner_hash', owner).maybeSingle()).data

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
      // מוחקים גם את הקבצים של המשימה מהאחסון
      const t = await getTask(b.id)
      const paths = ((t?.docs ?? []) as Doc[]).flatMap((d) => (d.kind === 'file' && d.path?.startsWith(prefix) ? [d.path] : []))
      if (paths.length) await sb.storage.from(BUCKET).remove(paths)
      const { error } = await sb.from('yoman_tasks').delete().eq('id', b.id).eq('owner_hash', owner)
      return error ? json({ error: error.message }, 500) : json({ ok: true })
    }

    // כתובת העלאה חתומה לקובץ חדש
    case 'upload_url': {
      const safe = str(b.name ?? 'file', 200).replace(/[^A-Za-z0-9._-]/g, '_').slice(-80)
      const path = `${prefix}${Date.now()}_${safe}`
      const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path)
      return error ? json({ error: error.message }, 500) : json({ path, token: data.token })
    }

    // הוספת מסמך למשימה: קובץ שכבר הועלה, או קישור
    case 'doc_add': {
      const t = await getTask(b.id)
      if (!t) return json({ error: 'not_found' }, 404)
      const d = b.doc ?? {}
      const docs: Doc[] = Array.isArray(t.docs) ? t.docs : []
      if (docs.length >= 20) return json({ error: 'too_many_docs' }, 400)
      let doc: Doc
      if (d.kind === 'link') {
        const url = str(d.url, 1000)
        if (!/^https?:\/\//i.test(url)) return json({ error: 'bad_url' }, 400)
        doc = { id: crypto.randomUUID(), kind: 'link', name: str(d.name, 120) || new URL(url).hostname, url }
      } else if (d.kind === 'file' && typeof d.path === 'string' && d.path.startsWith(prefix)) {
        doc = { id: crypto.randomUUID(), kind: 'file', name: str(d.name, 120) || 'מסמך', path: d.path, size: Number(d.size) || 0 }
      } else return json({ error: 'bad_doc' }, 400)
      const { data, error } = await sb.from('yoman_tasks').update({ docs: [...docs, doc] }).eq('id', b.id).eq('owner_hash', owner).select(COLS).single()
      return error ? json({ error: error.message }, 500) : json({ task: data })
    }

    case 'doc_remove': {
      const t = await getTask(b.id)
      if (!t) return json({ error: 'not_found' }, 404)
      const docs: Doc[] = Array.isArray(t.docs) ? t.docs : []
      const gone = docs.find((x) => x.id === b.doc_id)
      if (gone?.kind === 'file' && gone.path?.startsWith(prefix)) await sb.storage.from(BUCKET).remove([gone.path])
      const { data, error } = await sb.from('yoman_tasks').update({ docs: docs.filter((x) => x.id !== b.doc_id) }).eq('id', b.id).eq('owner_hash', owner).select(COLS).single()
      return error ? json({ error: error.message }, 500) : json({ task: data })
    }

    // כתובת צפייה חתומה לקובץ של משימה
    case 'doc_url': {
      const t = await getTask(b.id)
      const d = ((t?.docs ?? []) as Doc[]).find((x) => x.id === b.doc_id)
      if (!d || d.kind !== 'file' || !d.path?.startsWith(prefix)) return json({ error: 'not_found' }, 404)
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(d.path, 3600)
      return json({ url: data?.signedUrl ?? null })
    }

    default:
      return json({ error: 'unknown_action' }, 400)
  }
})
