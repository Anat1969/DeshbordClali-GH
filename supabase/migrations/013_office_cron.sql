-- משמרת השרת של המשרד: כל 10 דקות. הסוד נקרא מהטבלה בזמן הריצה, ולכן לא נשמר כאן
select cron.schedule('yoman-office-shift', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://ktqmwpbzcnzkhjskqisy.supabase.co/functions/v1/yoman-office',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select cron_secret from public.yoman_office_config where id = 1)),
    timeout_milliseconds := 120000) $$);
