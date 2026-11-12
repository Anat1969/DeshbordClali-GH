-- יומן חכם: סכמה ראשונית

create extension if not exists "uuid-ossp";

-- אירועים
create table events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time,
  location text,
  people text[] not null default '{}',   -- מערך שמות
  description text,
  raw_source text,                       -- הטקסט שחולץ מהמסמך
  source_file_url text,                  -- נתיב ב-Storage (נחתם בעת פתיחה)
  source_file_name text,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on events(user_id, event_date);
create index on events(event_date, reminder_sent);

alter table events enable row level security;
create policy "users manage own events" on events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- פרופיל: מספר הווצאפ לתזכורות (בנפרד מ-auth.users, שאי אפשר לשלוף ממנו דרך ה-API)
create table profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  whatsapp_number text not null default ''
);
alter table profiles enable row level security;
create policy "users manage own profile" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- אחסון מסמכים: bucket פרטי, כל משתמשת רואה רק את התיקייה שלה
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

create policy "own documents read" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own documents write" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own documents delete" on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
