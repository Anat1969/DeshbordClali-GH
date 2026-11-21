-- יומן חכם: שיחת Claude מוכנה לכל אפליקציה בדוח. מפה של ריפו לכתובת השיחה שמחוברת אליו
alter table yoman_app_reports add column if not exists sessions jsonb not null default '{}'::jsonb;
