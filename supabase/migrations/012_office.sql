-- המשרד: תור עבודה מתמשך, מדיניות הרשאות, יומן ריצות, ימי עבודה, כללים ובדיקות זמינות.
-- הכול נעול ב-RLS בלי מדיניות: הגישה רק דרך הפונקציה yoman-office (מפתח שירות), או דרך המשימה הלילית (SQL ישיר).

-- הגדרות: בעלת המשרד, מפתח אישור (רק ה-hash), סוד לתזמון, ותקציב
create table if not exists yoman_office_config (
  id int primary key default 1 check (id = 1),
  owner_hash text not null,
  approver_hash text,
  cron_secret text not null,
  budget jsonb not null default '{"daily_tokens":300000,"night_deploys":20,"reserve_deploys":20,"night_sessions":3}'::jsonb,
  updated_at timestamptz not null default now()
);

-- מדיניות: לכל סוג עבודה רמה (1 שגרה, 2 שדרוג במסגרת מדיניות, 3 החלטה של ענת) והאם מבוצע לבד
create table if not exists yoman_office_policies (
  kind text primary key,
  level int not null check (level between 1 and 3),
  auto boolean not null default false,
  executor text not null check (executor in ('server', 'claude_code')),
  label text not null,
  description text not null,
  minutes_saved int not null default 0, -- הערכה: כמה דקות עבודה ידנית חוסכת ריצה אחת
  locked boolean not null default false, -- רמה 3 ובטיחות: אי אפשר להפוך לאוטומטי
  updated_at timestamptz not null default now()
);

-- התור: כל עבודה, מהצעה ועד ביצוע. dedupe_key מונע כפילות, lease_until מונע התנגשות ומאפשר התאוששות
create table if not exists yoman_office_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null references yoman_office_policies(kind),
  level int not null check (level between 1 and 3),
  executor text not null check (executor in ('server', 'claude_code', 'anat')),
  status text not null default 'queued' check (status in ('proposed', 'queued', 'running', 'done', 'failed', 'rejected', 'canceled')),
  title text not null,
  found text,      -- מה זוהה
  why text,        -- למה זה משמעותי
  solution text,   -- הפתרון המוצע
  value text,      -- הערך שיתקבל
  risks text,      -- עלויות, תלויות וסיכונים
  app_name text,
  repo text check (repo is null or repo ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  branch text,
  workdir text,
  live_url text,
  depends_on text[],
  prompt text,     -- הפרומפט המלא לביצוע, כולל בדיקת הסף של הריפו
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  score int not null default 0, -- תרומה אמיתית לעבודה של ענת, 0 עד 100
  source text not null default 'system' check (source in ('system', 'night_report', 'anat', 'evening')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  lease_until timestamptz,
  locked_by text,
  run_after timestamptz not null default now(),
  dedupe_key text unique,
  decided_at timestamptz,
  decided_note text,
  tokens int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists yoman_office_jobs_pick on yoman_office_jobs (status, executor, run_after);
create index if not exists yoman_office_jobs_recent on yoman_office_jobs (finished_at desc);

-- יומן ריצות: כל ניסיון, הצלחה או כישלון, עם טוקנים. מכאן נמדדים חיסכון ועלות
create table if not exists yoman_office_runs (
  id bigint generated always as identity primary key,
  job_id uuid references yoman_office_jobs(id) on delete set null,
  kind text,
  worker text not null,
  ok boolean not null,
  summary text,
  tokens int not null default 0,
  model text,
  detail jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now()
);
create index if not exists yoman_office_runs_time on yoman_office_runs (finished_at desc);

-- יום עבודה: הכוונה בבוקר, סיכום בערב, ותוכנית הלילה שנגזרת ממנו
create table if not exists yoman_office_days (
  day date primary key,
  intent text,
  evening jsonb,
  night_plan jsonb,
  night_result jsonb,
  closed_at timestamptz,
  closed_by text,
  updated_at timestamptz not null default now()
);

-- למידה: החלטה נקודתית מול עיקרון קבוע. כלל פעיל משפיע על הצעות ועל פרומפטים
create table if not exists yoman_office_rules (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  scope text not null default 'decision' check (scope in ('decision', 'principle')),
  status text not null default 'proposed' check (status in ('proposed', 'active', 'archived')),
  source text,
  job_id uuid references yoman_office_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- זמינות האפליקציות: תוצאת הבדיקה האחרונה לכל כתובת, ורצף כישלונות
create table if not exists yoman_office_health (
  url text primary key,
  app_name text,
  repo text,
  status int,
  ms int,
  ok boolean,
  fail_streak int not null default 0,
  checked_at timestamptz not null default now()
);

-- נעילות: מונעות שתי ריצות מקבילות של אותו עובד
create table if not exists yoman_office_locks (
  name text primary key,
  holder text not null,
  until timestamptz not null
);

alter table yoman_office_config enable row level security;
alter table yoman_office_policies enable row level security;
alter table yoman_office_jobs enable row level security;
alter table yoman_office_runs enable row level security;
alter table yoman_office_days enable row level security;
alter table yoman_office_rules enable row level security;
alter table yoman_office_health enable row level security;
alter table yoman_office_locks enable row level security;
revoke all on yoman_office_config, yoman_office_policies, yoman_office_jobs, yoman_office_runs, yoman_office_days, yoman_office_rules, yoman_office_health, yoman_office_locks from anon, authenticated;

-- נעילה עם תפוגה: מחזירה true רק למחזיק אחד בכל רגע
create or replace function yoman_office_lock(p_name text, p_holder text, p_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare got int;
begin
  insert into yoman_office_locks (name, holder, until) values (p_name, p_holder, now() + make_interval(secs => p_seconds))
  on conflict (name) do update set holder = excluded.holder, until = excluded.until
    where yoman_office_locks.until < now() or yoman_office_locks.holder = excluded.holder;
  get diagnostics got = row_count;
  return got > 0;
end $$;

create or replace function yoman_office_unlock(p_name text, p_holder text)
returns void language sql security definer set search_path = public as $$
  delete from yoman_office_locks where name = p_name and holder = p_holder;
$$;

-- לקיחת עבודות מהתור: קודם מחזירה לתור עבודות שהריצה שלהן נקטעה, ואז נועלת עבודות פנויות (skip locked)
create or replace function yoman_office_claim(p_worker text, p_executor text, p_limit int default 1, p_lease_minutes int default 30)
returns setof yoman_office_jobs language plpgsql security definer set search_path = public as $$
begin
  update yoman_office_jobs
     set status = case when attempts >= max_attempts then 'failed' else 'queued' end,
         error = left(coalesce(error || ' | ', '') || 'הריצה נקטעה לפני סיום, הוחזרה לתור', 2000),
         run_after = now() + interval '10 minutes',
         locked_by = null, lease_until = null, updated_at = now(),
         finished_at = case when attempts >= max_attempts then now() else null end
   where status = 'running' and lease_until < now();

  return query
  update yoman_office_jobs j
     set status = 'running', locked_by = p_worker, attempts = j.attempts + 1,
         lease_until = now() + make_interval(mins => p_lease_minutes), updated_at = now()
   where j.id in (
     select q.id from yoman_office_jobs q
      where q.status = 'queued' and q.executor = p_executor and q.run_after <= now()
      order by q.score desc, q.created_at
      limit greatest(1, least(p_limit, 20))
      for update skip locked)
  returning j.*;
end $$;

-- סיום עבודה: רק מי שנעל אותה. כישלון חוזר לתור עם השהיה הולכת וגדלה, עד מספר הניסיונות
create or replace function yoman_office_finish(p_id uuid, p_worker text, p_ok boolean, p_summary text, p_result jsonb default null, p_tokens int default 0, p_model text default null)
returns text language plpgsql security definer set search_path = public as $$
declare j yoman_office_jobs; next_status text;
begin
  select * into j from yoman_office_jobs where id = p_id for update;
  if not found then return 'not_found'; end if;
  if j.status <> 'running' or j.locked_by is distinct from p_worker then return 'not_owner'; end if;
  next_status := case when p_ok then 'done' when j.attempts >= j.max_attempts then 'failed' else 'queued' end;
  update yoman_office_jobs set
    status = next_status,
    result = coalesce(p_result, result),
    error = case when p_ok then null else left(p_summary, 2000) end,
    tokens = tokens + coalesce(p_tokens, 0),
    run_after = case when next_status = 'queued' then now() + make_interval(mins => 15 * j.attempts) else run_after end,
    locked_by = null, lease_until = null, updated_at = now(),
    finished_at = case when next_status in ('done', 'failed') then now() else null end
  where id = p_id;
  insert into yoman_office_runs (job_id, kind, worker, ok, summary, tokens, model, detail)
  values (p_id, j.kind, p_worker, p_ok, left(p_summary, 2000), coalesce(p_tokens, 0), p_model, p_result);
  return next_status;
end $$;

revoke execute on function yoman_office_lock(text, text, int), yoman_office_unlock(text, text),
  yoman_office_claim(text, text, int, int), yoman_office_finish(uuid, text, boolean, text, jsonb, int, text) from public, anon, authenticated;

-- קטלוג סוגי העבודה. ברירת מחדל זהירה: שגרה בלי שינוי קוד רצה לבד, שינוי קוד מחכה להפעלה של ענת
insert into yoman_office_policies (kind, level, auto, executor, label, description, minutes_saved, locked) values
  ('health_check', 1, true, 'server', 'בדיקת זמינות האפליקציות', 'כל כתובת חיה מאפליקציית האפליקציות נבדקת. אפליקציה שנפלה פעמיים ברצף פותחת עבודת תיקון.', 15, false),
  ('data_hygiene', 1, true, 'server', 'ניקוי כפילויות ביומן ובמשימות', 'אירוע או משימה פתוחה שזהים לגמרי לאחרים נמחקים. כל מחיקה נשמרת בהיסטוריה וניתנת לשחזור.', 5, false),
  ('stale_watch', 1, true, 'server', 'איתור מה שנתקע', 'פרויקט שלא עודכן שבוע ומשימה פתוחה מעל שבועיים עולים לתדריך הבוקר. לא משנה דבר.', 5, false),
  ('report_sync', 1, true, 'server', 'סנכרון הדוח הלילי לתור', 'כל מה שהדוח הלילי מצא כחסר הופך לעבודה עם ריפו, ענף ופרומפט. מה שסומן "טופל" נסגר.', 10, false),
  ('evening_close', 1, true, 'server', 'סגירת יום אוטומטית', 'אם היום לא נסגר עד 21:00, הסיכום ותוכנית הלילה נוצרים לבד.', 10, false),
  ('repo_maintenance', 2, false, 'claude_code', 'מיזוג ופריסה של עבודה שנשארה', 'ענף שלא מוזג או פריסה שחסרה, לפי הדוח הלילי. בדיקה ירוקה לפני מיזוג, ובכישלון אין מיזוג.', 20, false),
  ('app_fix', 2, false, 'claude_code', 'תיקון אפליקציה שנפלה', 'אפליקציה שלא עונה פעמיים ברצף: אבחון, תיקון ממוקד, בדיקה ופריסה, או חזרה לגרסה התקינה האחרונה.', 30, false),
  ('code_quality', 2, false, 'claude_code', 'שיפור ביצועים ואיכות קוד', 'שיפור שאושר מראש בהצעה: בלי שינוי עיצוב, תוכן או לוגיקה שעובדת.', 30, false),
  ('innovation', 3, false, 'server', 'סריקת חדשנות', 'פעם בשבוע: הצעות שדרוג מדורגות לפי תרומה, עם פרומפט מוכן. כל הצעה מחכה להחלטה שלך.', 20, true),
  ('upgrade', 3, false, 'claude_code', 'שדרוג שהוצע ואושר', 'הצעה מרמה 3 שאישרת. מבוצעת בלילה בשיחה שמחוברת לריפו הנכון.', 45, true),
  ('rule_learning', 3, false, 'server', 'הפיכת תיקון לכלל קבוע', 'כלל חדש נכנס רק באישור שלך. המערכת לא משנה כללי הרשאה או בטיחות לבד.', 5, true)
on conflict (kind) do nothing;

-- חזון: הסריקה השבועית רצה בשרת, אבל התוצרים שלה הם הצעות. לכן היא מסומנת אוטומטית ונעולה
update yoman_office_policies set auto = true where kind = 'innovation';
