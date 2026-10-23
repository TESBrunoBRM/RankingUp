-- A business conflict is not a PostgreSQL serialization failure. PostgREST 14
-- retries 40001 indefinitely; PT409 returns an immediate HTTP 409 instead.
-- https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions
do $$
declare target record;
begin
  for target in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'admin_review_food','admin_moderate_post','admin_review_content_report','admin_review_bug'
    )
  loop
    execute replace(pg_get_functiondef(target.oid), '''40001''', '''PT409''');
  end loop;
end $$;
