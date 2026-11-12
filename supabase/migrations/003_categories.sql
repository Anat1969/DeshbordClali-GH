-- יומן חכם: קטגוריות בצבעי קשת
-- category: מפתח הצבע של האירוע. categories: שמות הקטגוריות של הבעלים (ערוכים במקרא)
alter table yoman_events
  add column if not exists category text
  check (category is null or category in ('red','orange','yellow','green','blue','indigo','violet'));

alter table yoman_profiles
  add column if not exists categories jsonb not null default '{}'::jsonb;
