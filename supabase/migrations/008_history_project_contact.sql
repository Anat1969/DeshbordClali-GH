-- יומן חכם: היסטוריה לקישורים ולאנשי קשר, ואיש קשר לכל פרויקט
create table yoman_history (
  id bigserial primary key,
  owner_hash text not null references yoman_keys(key_hash) on delete cascade on update cascade,
  kind text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index on yoman_history(owner_hash, kind, created_at desc);
alter table yoman_history enable row level security;

alter table yoman_projects
  add column if not exists contact_name text,
  add column if not exists contact_email text;
