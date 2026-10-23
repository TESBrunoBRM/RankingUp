-- Preferences simplify navigation; they are not permissions or medical clearance.
create table public.user_experiences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  features text[] not null check (
    cardinality(features) between 1 and 3
    and features <@ array['training', 'nutrition', 'community']::text[]
    and array_position(features, null) is null
  ),
  safety_version text not null,
  acknowledged_at timestamptz not null,
  guide_completed_at timestamptz not null
);

create table public.experience_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  features text[] not null,
  safety_version text not null,
  acknowledged_at timestamptz not null
);
create index experience_acceptances_user_id_idx on public.experience_acceptances (user_id);

alter table public.user_experiences enable row level security;
alter table public.experience_acceptances enable row level security;
revoke all on public.user_experiences, public.experience_acceptances from anon, authenticated;
grant select, insert, update on public.user_experiences to service_role;
grant select, insert on public.experience_acceptances to service_role;
grant usage, select on sequence public.experience_acceptances_id_seq to service_role;
-- Only authenticated API endpoints write receipts with a server timestamp.
