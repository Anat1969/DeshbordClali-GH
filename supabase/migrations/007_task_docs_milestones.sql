-- יומן חכם: מסמכים למשימות (קבצים וקישורים) ואבני דרך לפרויקטים
alter table yoman_tasks add column if not exists docs jsonb not null default '[]'::jsonb;
alter table yoman_projects add column if not exists milestones jsonb not null default '[]'::jsonb;
