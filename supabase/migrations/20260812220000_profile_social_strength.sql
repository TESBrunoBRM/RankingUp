alter table public.profiles
  add column if not exists age smallint,
  add column if not exists gender text,
  add column if not exists username text,
  add column if not exists bio text not null default '',
  add column if not exists is_public boolean not null default true;

update public.profiles
set username = 'atleta_' || left(replace(id::text, '-', ''), 12)
where username is null or btrim(username) = '';

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

create index if not exists profiles_public_username_search_idx
  on public.profiles (is_public, lower(username));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_age_check') then
    alter table public.profiles add constraint profiles_age_check check (age is null or age between 10 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_gender_check') then
    alter table public.profiles add constraint profiles_gender_check check (gender is null or gender in ('hombre', 'mujer'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_check') then
    alter table public.profiles add constraint profiles_username_check
      check (username is null or username ~ '^[a-z0-9_]{3,24}$');
  end if;
end $$;

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_not_self check (follower_id <> following_id)
);

create index if not exists profile_follows_following_idx
  on public.profile_follows (following_id, created_at desc);

alter table public.profile_follows enable row level security;
revoke all on table public.profile_follows from anon, authenticated;
grant select, insert, delete on table public.profile_follows to service_role;
grant select, update on table public.profiles to service_role;

