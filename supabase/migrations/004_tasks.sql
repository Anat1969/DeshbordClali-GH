-- יומן חכם: רשימת משימות. גישה רק דרך Edge Function yoman-tasks (service role)
create table yoman_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null references yoman_keys(key_hash) on delete cascade on update cascade,
  text text not null,
  note text,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index on yoman_tasks(owner_hash, done, created_at);
alter table yoman_tasks enable row level security;
