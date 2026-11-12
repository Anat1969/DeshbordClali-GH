-- יומן חכם (YOMAN): סכמה ראשונית. קידומת yoman_ כי הפרויקט CULTURA-GH משותף לאפליקציות רבות


-- אירועים
create table yoman_events (
  id uuid primary key default gen_random_uuid(),
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

create index on yoman_events(user_id, event_date);
create index on yoman_events(event_date, reminder_sent);

alter table yoman_events enable row level security;
create policy "yoman own events" on yoman_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- פרופיל: מספר הווצאפ לתזכורות (בנפרד מ-auth.users, שאי אפשר לשלוף ממנו דרך ה-API)
create table yoman_profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  whatsapp_number text not null default ''
);
alter table yoman_profiles enable row level security;
create policy "yoman own profile" on yoman_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- אחסון מסמכים: bucket פרטי, כל משתמשת רואה רק את התיקייה שלה
insert into storage.buckets (id, name, public) values ('yoman-documents', 'yoman-documents', false)
  on conflict (id) do nothing;

create policy "yoman documents read" on storage.objects for select
  using (bucket_id = 'yoman-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "yoman documents write" on storage.objects for insert
  with check (bucket_id = 'yoman-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "yoman documents delete" on storage.objects for delete
  using (bucket_id = 'yoman-documents' and (storage.foldername(name))[1] = auth.uid()::text);
