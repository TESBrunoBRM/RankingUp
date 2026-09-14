insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

do $$ begin
  if not exists (select 1 from pg_type where typname = 'post_visibility' and typnamespace = 'public'::regnamespace) then
    create type public.post_visibility as enum ('public', 'followers', 'private');
  end if;
end $$;

alter table public.workout_logs
  add column if not exists description text,
  add column if not exists photo_path text,
  add column if not exists visibility public.post_visibility not null default 'followers',
  add column if not exists published_at timestamptz;

create index if not exists workout_logs_feed_idx on public.workout_logs (user_id, published_at desc)
  where published_at is not null;

create table if not exists public.workout_log_likes (
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workout_log_id, user_id)
);
create index if not exists workout_log_likes_user_idx on public.workout_log_likes (user_id, created_at desc);
alter table public.workout_log_likes enable row level security;
revoke all on table public.workout_log_likes from anon, authenticated;
grant select, insert, delete on table public.workout_log_likes to service_role;
drop policy if exists "Backend only workout log likes" on public.workout_log_likes;
create policy "Backend only workout log likes" on public.workout_log_likes
  for all to anon, authenticated using (false) with check (false);
