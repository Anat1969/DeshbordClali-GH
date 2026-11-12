# יומן חכם: זרימה והפעלה

## הזרימה
1. מעלים מסמך (PDF, תמונה, אימייל, טקסט). הקובץ נשמר ב-Storage תחת `documents/{user_id}/`.
2. Edge Function `extract-event` שולחת ל-Claude ומחזירה JSON. מפתח Claude נשאר בשרת.
3. מסך האישור מציג מה חולץ. אפשר לערוך, ורק "שמירה ביומן" כותבת לטבלה.
4. הלוח החודשי מציג את האירועים. לחיצה פותחת את הפרטים.
5. כל יום ב-08:00 (שעון ישראל) `daily-reminder` שולחת ווצאפ על אירועי מחר, ורק אז מסמנת `reminder_sent`.

## סטייה מהאיפיון המקורי (מוסברת)
- `VITE_CLAUDE_API_KEY` בצד לקוח היה חושף את המפתח לכל מבקרת. הקריאה עוברת ל-Edge Function.
- `select('*, auth.users!inner(phone)')` לא עובד ב-PostgREST. מספר הווצאפ נשמר בטבלת `profiles` ונקבע בהגדרות.
- חישוב "מחר" נעשה לפי Asia/Jerusalem ולא UTC.
- אין אימוג'י בהודעת הווצאפ (כלל קבוע).

## הפעלה (חד־פעמי)
```bash
supabase link --project-ref <REF>
supabase db push
supabase secrets set ANTHROPIC_API_KEY=... TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 CRON_SECRET=<אקראי>
supabase functions deploy extract-event send-test
supabase functions deploy daily-reminder --no-verify-jwt
```
בלוח של Supabase: Authentication, Providers, Google. כתובת ההחזרה היא כתובת Vercel.

## תזמון (SQL Editor, פעם אחת)
הפונקציה בודקת את השעה בישראל ושולחת רק ב-08:00, לכן מתזמנים אותה פעמיים ב-UTC (05:00 לקיץ, 06:00 לחורף), ורק אחת מהן שולחת בפועל.
```sql
select cron.schedule('reminder-0500utc', '0 5 * * *', $$
  select net.http_post('https://<REF>.supabase.co/functions/v1/daily-reminder', '{}'::jsonb,
    headers := '{"x-cron-secret":"<CRON_SECRET>"}'::jsonb) $$);
select cron.schedule('reminder-0600utc', '0 6 * * *', $$
  select net.http_post('https://<REF>.supabase.co/functions/v1/daily-reminder', '{}'::jsonb,
    headers := '{"x-cron-secret":"<CRON_SECRET>"}'::jsonb) $$);
```
בדיקה ידנית בכל שעה: מוסיפים `?force=1` לכתובת.

## Vercel
משתני סביבה: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. פריסה מ-`main`. הרישום ב-aoa_apps נעשה רק בהוראה מפורשת.
