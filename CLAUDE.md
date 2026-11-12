# CLAUDE.md — יומן חכם (Smart Calendar)

## מה האפליקציה עושה
מארגנת פגישות, תאריכים, שעות, אנשים ומקומות.
ענת זורקת מסמך (PDF, תמונה, אימייל, טקסט).
המערכת מחלצת את הפרטים, שומרת, מציגה בלוח שנה חודשי, ושולחת ווצאפ יום לפני האירוע.

---

## Stack

| שכבה | טכנולוגיה |
|------|------------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS (RTL) |
| Backend / DB | Supabase (Auth + PostgreSQL + Storage + Edge Functions) |
| AI חילוץ | Anthropic Claude API (claude-sonnet-4-5) |
| WhatsApp | Twilio WhatsApp API |
| Hosting | Vercel |
| Auth | Supabase Auth — Google Sign-In |

---

## מבנה תיקיות

```
smart-calendar/
├── CLAUDE.md
├── .env.local                  # מקומי בלבד, לא ב-git
├── .env.example                # תבנית — נכנס ל-git
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── CalendarMonthView.tsx   # לוח שנה חודשי
│   │   ├── EventCard.tsx           # כרטיס אירוע בלוח
│   │   ├── EventModal.tsx          # פרטי אירוע מלאים
│   │   ├── UploadZone.tsx          # drag & drop + preview
│   │   ├── ExtractionReview.tsx    # מה חולץ — לאישור ענת
│   │   ├── TopBar.tsx              # סרגל עליון קבוע
│   │   └── AIMenu.tsx              # <ai-menu> לוגו יחיד
│   ├── pages/
│   │   ├── Home.tsx                # לוח + העלאה
│   │   ├── EventDetail.tsx         # אירוע בודד
│   │   └── Settings.tsx            # ווצאפ, שפה, חשבון
│   ├── lib/
│   │   ├── supabase.ts             # client
│   │   ├── claude.ts               # קריאה ל-API לחילוץ
│   │   ├── whatsapp.ts             # Twilio WhatsApp
│   │   └── dateUtils.ts            # עזרי תאריך בעברית
│   ├── hooks/
│   │   ├── useEvents.ts
│   │   └── useUpload.ts
│   └── types/
│       └── index.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql
│   └── functions/
│       └── daily-reminder/
│           └── index.ts            # Edge Function — cron יומי
└── docs/
    └── flow.md
```

---

## סכמת בסיס נתונים (Supabase PostgreSQL)

```sql
-- 001_init.sql

create extension if not exists "uuid-ossp";

create table events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time,
  location text,
  people text[],                     -- מערך שמות
  description text,
  raw_source text,                   -- הטקסט שחולץ מהמסמך
  source_file_url text,              -- URL ב-Storage
  source_file_name text,
  reminder_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- אינדקסים
create index on events(user_id, event_date);
create index on events(event_date, reminder_sent);

-- RLS
alter table events enable row level security;

create policy "users see own events" on events
  for all using (auth.uid() = user_id);
```

---

## זרימת העבודה המלאה

### 1. העלאת מסמך
```
UploadZone
  → קובץ מועלה ל-Supabase Storage (bucket: documents, path: {user_id}/{timestamp}_{filename})
  → תוכן מחולץ לטקסט (PDF.js / image OCR)
  → נשלח ל-Claude API לחילוץ פרטים
```

### 2. חילוץ AI
```typescript
// src/lib/claude.ts
const EXTRACTION_PROMPT = `
אתה מחלץ פרטי אירוע מטקסט.
החזר JSON בלבד, ללא הסבר, בפורמט הזה:
{
  "title": "שם האירוע",
  "event_date": "YYYY-MM-DD",
  "event_time": "HH:MM" | null,
  "location": "מיקום" | null,
  "people": ["שם1", "שם2"] | [],
  "description": "תיאור קצר"
}
אם לא ניתן לחלץ תאריך — החזר null ב-event_date.
טקסט לחילוץ:
`;
```

### 3. אישור ענת
- ExtractionReview מציג את הפרטים שחולצו
- ענת יכולה לערוך כל שדה
- לחיצה על "שמור" → INSERT לטבלת events

### 4. לוח שנה חודשי
- CalendarMonthView מציג גריד 7×5/6 ימים
- כל יום מציג נקודה / כרטיסון אם יש אירוע
- לחיצה על אירוע → EventModal עם כל הפרטים

### 5. תזכורת ווצאפ
- Edge Function רצה כל יום ב-08:00 (cron: `0 6 * * *` UTC = 08:00 ישראל)
- מחפשת אירועים שה-event_date שלהם = מחר וה-reminder_sent = false
- שולחת ווצאפ דרך Twilio
- מעדכנת reminder_sent = true

---

## Edge Function — daily-reminder

```typescript
// supabase/functions/daily-reminder/index.ts
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('*, auth.users!inner(phone)')
    .eq('event_date', tomorrowStr)
    .eq('reminder_sent', false)

  const client = twilio(
    Deno.env.get('TWILIO_ACCOUNT_SID'),
    Deno.env.get('TWILIO_AUTH_TOKEN')
  )

  for (const event of events ?? []) {
    const msg = buildWhatsAppMessage(event)
    await client.messages.create({
      from: 'whatsapp:+14155238886',   // Twilio sandbox
      to: `whatsapp:${Deno.env.get('OWNER_WHATSAPP')}`,
      body: msg,
    })
    await supabase
      .from('events')
      .update({ reminder_sent: true })
      .eq('id', event.id)
  }

  return new Response('OK')
})

function buildWhatsAppMessage(event: any): string {
  const time = event.event_time ? ` בשעה ${event.event_time.slice(0, 5)}` : ''
  const location = event.location ? `\n📍 ${event.location}` : ''
  const people = event.people?.length ? `\n👥 ${event.people.join(', ')}` : ''
  return `🗓 מחר — ${event.title}${time}${location}${people}`
}
```

---

## משתני סביבה (.env.local)

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Claude API
VITE_CLAUDE_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
OWNER_WHATSAPP=+972XXXXXXXXX

# Supabase Edge Functions (מוגדר ב-Supabase dashboard)
SUPABASE_SERVICE_ROLE_KEY=
```

---

## עיצוב — עקרונות

- **רקע**: לבן (#FFFFFF)
- **טקסט ראשי**: שחור (#111111)
- **צבע אקטיבי**: כחול נייבי (#1A2B4A) — לאירועים ולכפתור שמירה
- **גופן**: Heebo (עברית) + Inter (מספרים)
- **כיוון**: RTL לאורך כל הממשק
- **סרגל עליון**: שם האפליקציה משמאל → לוגו `<ai-menu>` מימין, ללא מסגרת
- **כפתורים**: ללא border, צורה נקראת מהרקע ומהצל
- **לוח שנה**: גריד נקי, יום = תא 48px מינימום, נקודה כחולה כשיש אירוע
- **מסך העלאה**: Drag & Drop ממורכז, עם אנימציית border כשמגיעה קובץ

---

## סדר הבנייה

1. **בסיס** — Vite + React + TypeScript + Tailwind + Supabase auth (Google)
2. **DB** — migration 001_init.sql + RLS
3. **TopBar + AIMenu** — סרגל עליון קבוע
4. **CalendarMonthView** — לוח ריק קודם
5. **UploadZone** — drag & drop, העלאה ל-Storage
6. **חילוץ AI** — lib/claude.ts + ExtractionReview
7. **EventModal** — פרטי אירוע, עריכה, מחיקה
8. **Edge Function** — daily-reminder + cron
9. **Settings** — מספר ווצאפ, בדיקת שליחה
10. **Vercel deploy** + רישום ב-aoa_apps

---

## חידוש ייחודי באפליקציה זו
**חילוץ AI ממסמך לא מובנה** — ענת זורקת כל פורמט (PDF, תמונה, טקסט חופשי, אימייל) והמערכת מחלצת את המידע ומציגה אותו לאישור לפני השמירה.
זה לא קיים בשום לוח שנה סטנדרטי.

---

## כללי בנייה (מ-Claude-GH)
- עברית בכל שורה, כולל הערות קוד
- רואים לפני שפורסים — בדיקה ויזואלית בנייד ובמחשב
- מיזוג ל-main אחרי בדיקה ירוקה, פריסה מיידית ל-Vercel
- כתובת חיה + קישור ישיר בכל מסירה
- לא נוגעים ב-aoa_apps ללא הוראה מפורשת
