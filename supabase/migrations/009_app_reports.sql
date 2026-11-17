-- יומן חכם: דוח לילי "שדרוג אפליקציות". שורה אחת לכל יום עבודה.
-- נכתב ב-04:00 שעון ישראל על ידי משימה מתוזמנת של Claude, ונקרא רק דרך Edge Function yoman-reports (service role)
create table if not exists yoman_app_reports (
  report_date date primary key,              -- יום העבודה שנבדק (שעון ישראל)
  headline text not null,                     -- שורת תובנה, עד 8 מילים
  checked int not null default 0,             -- כמה אפליקציות נבדקו
  ok int not null default 0,                  -- מוזגו ונפרסו
  apps jsonb not null default '[]'::jsonb,    -- [{name, repo, live_url, status: ok|unmerged|not_deployed|failed, done, todo, branches:[{name, commits}]}]
  todo jsonb not null default '[]'::jsonb,    -- רשימת "מה צריך לעשות" מזוקקת
  created_at timestamptz not null default now()
);
alter table yoman_app_reports enable row level security;
