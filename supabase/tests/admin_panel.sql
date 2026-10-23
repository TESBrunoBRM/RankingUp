-- Run against the existing RankingUp schema after the admin migration.
-- All fixtures and decisions are rolled back, including the audit entries.
begin;
select set_config('rankingup.test_admin_id',(select id::text from auth.users where raw_app_meta_data->>'role'='admin' order by created_at limit 1),true);
set local role service_role;
do $test$
declare
  actor uuid := current_setting('rankingup.test_admin_id')::uuid;
  reporter uuid;
  food_id uuid; duplicate_id uuid; test_post_id uuid; report_id uuid; bug_id uuid;
  initial_at timestamptz; state_at timestamptz; row_data jsonb;
  baseline_audit bigint;
begin
  select id into reporter from public.profiles where id<>actor limit 1;
  if actor is null or reporter is null then raise exception 'Se requieren dos perfiles existentes para la prueba transaccional.'; end if;
  if has_table_privilege('authenticated','public.post_moderation','UPDATE')
    or has_table_privilege('authenticated','public.content_reports','SELECT')
    or has_table_privilege('authenticated','public.admin_action_log','SELECT')
    or has_function_privilege('authenticated','public.admin_review_food(uuid,uuid,text,text,jsonb,text,timestamptz)','EXECUTE') then
    raise exception 'Los permisos del cliente son demasiado amplios.';
  end if;
  insert into public.food_submissions(submitted_by,food_name,barcode,serving_amount,serving_unit,calories,protein,carbs,fat,image_path,source_mode)
    values(reporter,'Alimento de prueba',gen_random_uuid()::text,100,'g',100,10,10,2,reporter::text||'/transaction-test.jpg','nutrition_label') returning id,updated_at into food_id,initial_at;
  row_data := public.admin_review_food(actor,food_id,'approved','Etiqueta revisada','{"calories":120,"food_name":"Alimento corregido"}'::jsonb,'Nota privada',initial_at);
  if row_data->>'food_name'<>'Alimento corregido' or row_data->'original_values'->>'food_name'<>'Alimento de prueba'
    or not exists(select 1 from public.food_submissions where id=food_id and status='approved')
    or not exists(select 1 from public.admin_action_log where resource_id=food_id and action='approved') then
    raise exception 'Falló la aprobación, el original o la auditoría.';
  end if;
  begin
    perform public.admin_review_food(actor,food_id,'rejected','Revisión desactualizada');
    raise exception 'Se aceptó una revisión repetida.';
  exception when sqlstate 'PT409' then null; end;
  begin
    update public.food_submissions set original_values='{}' where id=food_id;
    raise exception 'El original pudo modificarse.';
  exception when invalid_parameter_value then null; end;
  insert into public.food_submissions(submitted_by,food_name,barcode,serving_amount,serving_unit,calories,protein,carbs,fat,image_path,source_mode)
    select reporter,'Duplicado de prueba',barcode,100,'g',100,10,10,2,reporter::text||'/transaction-test.jpg','nutrition_label'
    from public.food_submissions where id=food_id returning id into duplicate_id;
  select count(*) into baseline_audit from public.admin_action_log;
  begin
    perform public.admin_review_food(actor,duplicate_id,'approved','Revisión duplicada');
    raise exception 'Se aceptó un código de barras duplicado.';
  exception when unique_violation then null; end;
  if (select status from public.food_submissions where id=duplicate_id)<>'pending'
    or (select count(*) from public.admin_action_log)<>baseline_audit then raise exception 'La transacción no fue atómica.'; end if;

  insert into public.workout_logs(user_id,name,description,published_at,visibility,xp_awarded,total_volume)
    values(actor,'Publicación de prueba','Contexto inicial',clock_timestamp(),'public',37,250) returning id into test_post_id;
  insert into public.content_reports(submitted_by,post_id,post_snapshot,reason)
    values(reporter,test_post_id,jsonb_build_object('id',test_post_id,'name','Publicación de prueba'),'spam') returning id,updated_at into report_id,initial_at;
  begin
    insert into public.content_reports(submitted_by,post_id,post_snapshot,reason) values(reporter,test_post_id,'{}','spam');
    raise exception 'Se aceptó una denuncia abierta duplicada.';
  exception when unique_violation then null; end;
  perform public.admin_review_content_report(actor,report_id,'resolved','Oculta por spam','Nota privada',initial_at,true,null);
  if exists(select 1 from public.visible_progress_posts where id=test_post_id)
    or (select xp_awarded from public.workout_logs where id=test_post_id)<>37
    or (select total_volume from public.workout_logs where id=test_post_id)<>250 then raise exception 'Falló la ocultación o se modificó el entrenamiento.'; end if;
  -- Editing the ordinary workout fields must not clear protected moderation.
  update public.workout_logs set description='Texto editado',visibility='public',published_at=clock_timestamp() where id=test_post_id;
  if exists(select 1 from public.visible_progress_posts where id=test_post_id) then raise exception 'Editar permitió eludir la moderación.'; end if;
  select updated_at into state_at from public.post_moderation where post_id=test_post_id;
  perform public.admin_moderate_post(actor,test_post_id,false,'Restaurada tras revisar',state_at);
  if not exists(select 1 from public.visible_progress_posts where id=test_post_id and published_at is not null) then raise exception 'La restauración falló.'; end if;
  select updated_at into state_at from public.post_moderation where post_id=test_post_id;
  perform public.admin_moderate_post(actor,test_post_id,true,'Oculta nuevamente',state_at);
  update public.workout_logs set published_at=null,visibility='private' where id=test_post_id;
  select updated_at into state_at from public.post_moderation where post_id=test_post_id;
  perform public.admin_moderate_post(actor,test_post_id,false,'Se conserva la retirada del autor',state_at);
  if exists(select 1 from public.visible_progress_posts where id=test_post_id and published_at is not null) then raise exception 'Se volvió a publicar una entrada retirada.'; end if;

  insert into public.bug_reports(submitted_by,title,description,steps,app_version,platform)
    values(reporter,'Problema de prueba','Descripción de prueba completa','Abrir y guardar','1.0.0','android') returning id,updated_at into bug_id,initial_at;
  perform public.admin_review_bug(actor,bug_id,'resolved','high','Corregido en la siguiente versión','Nota interna',initial_at);
  begin
    perform public.admin_review_bug(actor,bug_id,'closed','normal','Cambio desactualizado',null,initial_at);
    raise exception 'Se aceptó una actualización desactualizada de un bug.';
  exception when sqlstate 'PT409' then null; end;
  if not exists(select 1 from public.admin_action_log where resource_id=bug_id and action='resolved') then raise exception 'Falta auditoría del bug.'; end if;
end $test$;
select 'PASS: approvals, immutable originals, duplicate barcodes, atomic audits, moderation, restoration, stale updates and private grants' as result;
rollback;
