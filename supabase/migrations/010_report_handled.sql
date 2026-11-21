-- יומן חכם: סימון "טופל" בדוח שדרוג האפליקציות. רשימת הריפו שענת סימנה כטופלו, לכל דוח
alter table yoman_app_reports add column if not exists handled jsonb not null default '[]'::jsonb;
