-- Additive migration for the existing RankingUp schema. All writes go through
-- the API; the mobile client's ownership policy on workout_logs must never
-- allow it to change moderation state.
alter table public.food_submissions add column original_values jsonb;
update public.food_submissions set original_values = jsonb_build_object(
  'food_name', food_name, 'brand_name', brand_name, 'barcode', barcode,
  'serving_amount', serving_amount, 'serving_unit', serving_unit,
  'calories', calories, 'protein', protein, 'carbs', carbs, 'fat', fat,
  'source_mode', source_mode, 'submitter_notes', submitter_notes);
alter table public.food_submissions alter column original_values set not null;

create function public.preserve_food_submission_original() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    NEW.original_values := jsonb_build_object(
      'food_name', NEW.food_name, 'brand_name', NEW.brand_name, 'barcode', NEW.barcode,
      'serving_amount', NEW.serving_amount, 'serving_unit', NEW.serving_unit,
      'calories', NEW.calories, 'protein', NEW.protein, 'carbs', NEW.carbs, 'fat', NEW.fat,
      'source_mode', NEW.source_mode, 'submitter_notes', NEW.submitter_notes);
  elsif NEW.original_values is distinct from OLD.original_values then
    raise exception 'El aporte original es inmutable.' using errcode = '22023';
  end if;
  return NEW;
end $$;
revoke all on function public.preserve_food_submission_original() from public, anon, authenticated;
create trigger preserve_food_submission_original before insert or update on public.food_submissions
  for each row execute function public.preserve_food_submission_original();

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.profiles(id) on delete set null,
  post_id uuid references public.workout_logs(id) on delete set null,
  post_snapshot jsonb not null,
  reason text not null check (reason in ('spam','harassment','inappropriate','violence','misinformation','other')),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending','in_review','resolved','dismissed')),
  public_response text check (char_length(public_response) <= 2000),
  internal_notes text check (char_length(internal_notes) <= 4000),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index content_reports_queue_idx on public.content_reports(status, created_at, id);
create index content_reports_owner_idx on public.content_reports(submitted_by, created_at desc, id);
create index content_reports_post_idx on public.content_reports(post_id);
create index content_reports_reviewer_idx on public.content_reports(reviewed_by);
create unique index content_reports_open_unique on public.content_reports(submitted_by, post_id)
  where status in ('pending','in_review');

create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 10 and 4000),
  steps text not null check (char_length(btrim(steps)) between 3 and 4000),
  app_version text not null check (char_length(app_version) between 1 and 64),
  platform text not null check (char_length(platform) between 1 and 80),
  screenshot_path text,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  public_response text check (char_length(public_response) <= 2000),
  internal_notes text check (char_length(internal_notes) <= 4000),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index bug_reports_queue_idx on public.bug_reports(status, created_at, id);
create index bug_reports_owner_idx on public.bug_reports(submitted_by, created_at desc, id);
create index bug_reports_reviewer_idx on public.bug_reports(reviewed_by);

-- Intentionally no cascading foreign key to workout_logs: keep a tombstone if
-- an owner deletes and recreates a log with the same UUID through the Data API.
create table public.post_moderation (
  post_id uuid primary key,
  hidden boolean not null,
  reason text not null check (char_length(btrim(reason)) between 2 and 2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default clock_timestamp()
);
create index post_moderation_reviewer_idx on public.post_moderation(reviewed_by);

create table public.admin_action_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  resource_type text not null check (resource_type in ('food_submission','content_report','bug_report','post')),
  resource_id uuid not null,
  action text not null,
  public_response text,
  internal_notes text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index admin_action_log_created_idx on public.admin_action_log(created_at desc, id);
create index admin_action_log_resource_idx on public.admin_action_log(resource_type,resource_id,created_at desc);
create index admin_action_log_actor_idx on public.admin_action_log(actor_id);

alter table public.content_reports enable row level security;
alter table public.bug_reports enable row level security;
alter table public.post_moderation enable row level security;
alter table public.admin_action_log enable row level security;
revoke all on public.content_reports, public.bug_reports, public.post_moderation, public.admin_action_log from public, anon, authenticated;
grant select, insert, update on public.content_reports, public.bug_reports, public.post_moderation to service_role;
grant select, insert on public.admin_action_log to service_role;

create view public.visible_progress_posts with (security_invoker = true) as
select w.* from public.workout_logs w where not exists (
  select 1 from public.post_moderation m where m.post_id = w.id and m.hidden
);
revoke all on public.visible_progress_posts from public, anon, authenticated;
grant select on public.visible_progress_posts to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('bug-evidence','bug-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create function public.admin_review_food(
  p_admin_id uuid, p_id uuid, p_status text, p_note text,
  p_corrections jsonb default '{}', p_internal_notes text default null,
  p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_before public.food_submissions; v_next public.food_submissions;
begin
  if p_status not in ('approved','rejected') then raise exception 'Estado inválido.' using errcode='22023'; end if;
  if p_corrections - array['food_name','brand_name','barcode','serving_amount','serving_unit','calories','protein','carbs','fat'] <> '{}'::jsonb then
    raise exception 'Campos de corrección inválidos.' using errcode='22023';
  end if;
  select * into v_before from public.food_submissions where id=p_id for update;
  if not found then raise exception 'Aporte no encontrado.' using errcode='P0002'; end if;
  if v_before.status <> 'pending' or (p_expected_updated_at is not null and v_before.updated_at <> p_expected_updated_at) then
    raise exception 'El aporte ya cambió. Actualiza la bandeja.' using errcode='40001';
  end if;
  v_next := jsonb_populate_record(v_before, p_corrections);
  update public.food_submissions set
    food_name=v_next.food_name, brand_name=v_next.brand_name, barcode=nullif(btrim(v_next.barcode),''),
    serving_amount=v_next.serving_amount, serving_unit=v_next.serving_unit,
    calories=v_next.calories, protein=v_next.protein, carbs=v_next.carbs, fat=v_next.fat,
    status=p_status, review_note=nullif(btrim(p_note),''), reviewed_by=p_admin_id,
    reviewed_at=clock_timestamp(), updated_at=clock_timestamp()
  where id=p_id returning * into v_next;
  insert into public.admin_action_log(actor_id,resource_type,resource_id,action,public_response,internal_notes,before_data,after_data)
    values(p_admin_id,'food_submission',p_id,p_status,p_note,p_internal_notes,to_jsonb(v_before),to_jsonb(v_next));
  return to_jsonb(v_next);
end $$;

create function public.admin_moderate_post(
  p_admin_id uuid, p_id uuid, p_hidden boolean, p_reason text,
  p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_before public.post_moderation; v_next public.post_moderation;
begin
  if char_length(btrim(coalesce(p_reason,''))) not between 2 and 2000 then
    raise exception 'Escribe un motivo de moderación.' using errcode='22023';
  end if;
  perform id from public.workout_logs where id=p_id for update;
  if not found then raise exception 'La publicación ya no existe.' using errcode='P0002'; end if;
  select * into v_before from public.post_moderation where post_id=p_id for update;
  if v_before.updated_at is distinct from p_expected_updated_at then
    raise exception 'La moderación ya cambió. Actualiza el detalle.' using errcode='40001';
  end if;
  insert into public.post_moderation(post_id,hidden,reason,reviewed_by,updated_at)
    values(p_id,p_hidden,btrim(p_reason),p_admin_id,clock_timestamp())
    on conflict(post_id) do update set hidden=excluded.hidden, reason=excluded.reason,
      reviewed_by=excluded.reviewed_by, updated_at=excluded.updated_at
    returning * into v_next;
  insert into public.admin_action_log(actor_id,resource_type,resource_id,action,public_response,before_data,after_data)
    values(p_admin_id,'post',p_id,case when p_hidden then 'hidden' else 'restored' end,p_reason,to_jsonb(v_before),to_jsonb(v_next));
  return to_jsonb(v_next);
end $$;

create function public.admin_review_content_report(
  p_admin_id uuid, p_id uuid, p_status text, p_public_response text, p_internal_notes text,
  p_expected_updated_at timestamptz, p_hide_post boolean default false,
  p_expected_post_updated_at timestamptz default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_before public.content_reports; v_next public.content_reports;
begin
  if p_status not in ('pending','in_review','resolved','dismissed') then raise exception 'Estado inválido.' using errcode='22023'; end if;
  if p_status in ('resolved','dismissed') and char_length(btrim(coalesce(p_public_response,''))) < 2 then
    raise exception 'Escribe una respuesta para el usuario.' using errcode='22023';
  end if;
  select * into v_before from public.content_reports where id=p_id for update;
  if not found then raise exception 'Denuncia no encontrada.' using errcode='P0002'; end if;
  if v_before.updated_at is distinct from p_expected_updated_at then
    raise exception 'La denuncia ya cambió. Actualiza el detalle.' using errcode='40001';
  end if;
  if p_hide_post then
    if p_status <> 'resolved' then raise exception 'Ocultar requiere resolver la denuncia.' using errcode='22023'; end if;
    perform public.admin_moderate_post(p_admin_id,v_before.post_id,true,p_public_response,p_expected_post_updated_at);
  end if;
  update public.content_reports set status=p_status, public_response=nullif(btrim(p_public_response),''),
    internal_notes=p_internal_notes, reviewed_by=p_admin_id, updated_at=clock_timestamp()
    where id=p_id returning * into v_next;
  insert into public.admin_action_log(actor_id,resource_type,resource_id,action,public_response,internal_notes,before_data,after_data)
    values(p_admin_id,'content_report',p_id,p_status,p_public_response,p_internal_notes,to_jsonb(v_before),to_jsonb(v_next));
  return to_jsonb(v_next);
end $$;

create function public.admin_review_bug(
  p_admin_id uuid, p_id uuid, p_status text, p_priority text, p_public_response text,
  p_internal_notes text, p_expected_updated_at timestamptz
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_before public.bug_reports; v_next public.bug_reports;
begin
  if p_status not in ('open','in_progress','resolved','closed') or p_priority not in ('low','normal','high','critical') then
    raise exception 'Estado o prioridad inválidos.' using errcode='22023';
  end if;
  if p_status in ('resolved','closed') and char_length(btrim(coalesce(p_public_response,''))) < 2 then
    raise exception 'Escribe una respuesta para el usuario.' using errcode='22023';
  end if;
  select * into v_before from public.bug_reports where id=p_id for update;
  if not found then raise exception 'Bug no encontrado.' using errcode='P0002'; end if;
  if v_before.updated_at is distinct from p_expected_updated_at then
    raise exception 'El bug ya cambió. Actualiza el detalle.' using errcode='40001';
  end if;
  update public.bug_reports set status=p_status, priority=p_priority, public_response=nullif(btrim(p_public_response),''),
    internal_notes=p_internal_notes, reviewed_by=p_admin_id, updated_at=clock_timestamp()
    where id=p_id returning * into v_next;
  insert into public.admin_action_log(actor_id,resource_type,resource_id,action,public_response,internal_notes,before_data,after_data)
    values(p_admin_id,'bug_report',p_id,p_status,p_public_response,p_internal_notes,to_jsonb(v_before),to_jsonb(v_next));
  return to_jsonb(v_next);
end $$;

-- RPCs are invoker functions with an empty search_path, callable only by the
-- backend service role. No privileged browser/client grants.
revoke all on function public.admin_review_food(uuid,uuid,text,text,jsonb,text,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_moderate_post(uuid,uuid,boolean,text,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_review_content_report(uuid,uuid,text,text,text,timestamptz,boolean,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_review_bug(uuid,uuid,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_review_food(uuid,uuid,text,text,jsonb,text,timestamptz) to service_role;
grant execute on function public.admin_moderate_post(uuid,uuid,boolean,text,timestamptz) to service_role;
grant execute on function public.admin_review_content_report(uuid,uuid,text,text,text,timestamptz,boolean,timestamptz) to service_role;
grant execute on function public.admin_review_bug(uuid,uuid,text,text,text,text,timestamptz) to service_role;
