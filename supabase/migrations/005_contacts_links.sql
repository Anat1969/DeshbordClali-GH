-- יומן חכם: אנשי קשר (למסך העבודה) וקישורים חשובים. נשמרים בפרופיל של הבעלים
alter table yoman_profiles
  add column if not exists contacts jsonb not null default '[]'::jsonb,
  add column if not exists links jsonb not null default '[]'::jsonb;
