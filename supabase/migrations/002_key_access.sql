-- יומן חכם (YOMAN): מעבר מחשבונות Google לקישור פרטי עם מפתח.
-- הטבלאות היו ריקות. הגישה לנתונים רק דרך Edge Function yoman-api (service role),
-- ולכן ל-RLS אין מדיניות: כל פנייה ישירה עם המפתח הציבורי נחסמת.

drop policy if exists "yoman documents read" on storage.objects;
drop policy if exists "yoman documents write" on storage.objects;
drop policy if exists "yoman documents delete" on storage.objects;

drop table if exists yoman_events cascade;
drop table if exists yoman_profiles cascade;

-- מפתחות גישה: נשמר רק ה-SHA-256 של המפתח
create table yoman_keys (
  key_hash text primary key,
  created_at timestamptz not null default now()
);
alter table yoman_keys enable row level security;

create table yoman_events (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null references yoman_keys(key_hash) on delete cascade on update cascade,
  title text not null,
  event_date date not null,
  event_time time,
  location text,
  people text[] not null default '{}',
  description text,
  raw_source text,
  source_file_url text,
  source_file_name text,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on yoman_events(owner_hash, event_date);
create index on yoman_events(event_date, reminder_sent);
alter table yoman_events enable row level security;

create table yoman_profiles (
  owner_hash text primary key references yoman_keys(key_hash) on delete cascade on update cascade,
  whatsapp_number text not null default ''
);
alter table yoman_profiles enable row level security;
