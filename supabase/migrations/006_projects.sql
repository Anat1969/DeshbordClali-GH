-- יומן חכם: מעקב פרויקטים. גישה רק דרך Edge Function yoman-projects (service role)
create table yoman_projects (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null references yoman_keys(key_hash) on delete cascade on update cascade,
  name text not null,
  status text not null default 'active' check (status in ('planning','active','waiting','done')),
  progress int not null default 0 check (progress between 0 and 100),
  next_step text,
  due_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on yoman_projects(owner_hash, status, due_date);
alter table yoman_projects enable row level security;
