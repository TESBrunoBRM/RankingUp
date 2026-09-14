create table if not exists public.user_activity_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  sources text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists user_activity_days_user_date_idx
  on public.user_activity_days (user_id, activity_date desc);

alter table public.user_activity_days enable row level security;
revoke all on table public.user_activity_days from anon, authenticated;
grant select, insert, update on table public.user_activity_days to service_role;

drop policy if exists "Backend only activity days" on public.user_activity_days;
create policy "Backend only activity days"
  on public.user_activity_days for all to anon, authenticated
  using (false) with check (false);

alter table public.profiles
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists last_activity_date date,
  add column if not exists streak_timezone text;

create or replace function public.record_activity_day(
  p_user_id uuid,
  p_local_date date,
  p_source text
)
returns table (current_streak int, longest_streak int, is_new_day boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last date;
  v_current int;
  v_longest int;
  v_is_new_day boolean;
begin
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  select last_activity_date, coalesce(profiles.current_streak, 0), coalesce(profiles.longest_streak, 0)
    into v_last, v_current, v_longest
    from public.profiles where id = p_user_id;

  v_is_new_day := v_last is null or p_local_date > v_last;

  insert into public.user_activity_days (user_id, activity_date, sources)
  values (p_user_id, p_local_date, array[p_source])
  on conflict (user_id, activity_date) do update
    set sources = (select array_agg(distinct s)
                     from unnest(public.user_activity_days.sources || p_source) s);

  if v_last is null then
    v_current := 1;
  elsif p_local_date = v_last + 1 then
    v_current := v_current + 1;
  elsif p_local_date > v_last then
    v_current := 1;
  end if;

  v_longest := greatest(v_longest, v_current);

  update public.profiles
     set current_streak = v_current,
         longest_streak = v_longest,
         last_activity_date = greatest(coalesce(v_last, p_local_date), p_local_date)
   where id = p_user_id;

  return query select v_current, v_longest, v_is_new_day;
end;
$$;

revoke execute on function public.record_activity_day(uuid, date, text)
  from public, anon, authenticated;
grant execute on function public.record_activity_day(uuid, date, text)
  to service_role;
