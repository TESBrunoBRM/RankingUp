-- ---------------------------------------------------------------------------
-- Duelos 1v1 de flexiones.
--
-- Reparto de responsabilidades:
--   * Los contadores en vivo viajan por Realtime broadcast (efimero, no toca BD).
--   * El resultado autoritativo lo escribe SOLO el backend con service_role,
--     a partir de las repeticiones que reporta cada jugador al terminar.
--   Asi un cliente manipulado puede mentir en el contador que ve el rival, pero
--   no puede decidir el ganador ni el XP.
-- ---------------------------------------------------------------------------

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  game text not null default 'push_ups',
  target_reps integer not null default 30 check (target_reps between 5 and 500),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'finished', 'declined', 'cancelled', 'expired')),
  challenger_reps integer not null default 0 check (challenger_reps >= 0),
  opponent_reps integer not null default 0 check (opponent_reps >= 0),
  challenger_finished_at timestamptz,
  opponent_finished_at timestamptz,
  winner_id uuid references public.profiles(id) on delete set null,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz not null default now() + interval '10 minutes',
  constraint duels_distinct_players check (challenger_id <> opponent_id)
);

create index if not exists duels_opponent_status_idx on public.duels (opponent_id, status, created_at desc);
create index if not exists duels_challenger_status_idx on public.duels (challenger_id, status, created_at desc);
create index if not exists duels_status_expires_idx on public.duels (status, expires_at);

-- Un solo duelo abierto por pareja: evita spam de retos y estados ambiguos.
create unique index if not exists duels_single_open_per_pair
  on public.duels (least(challenger_id, opponent_id), greatest(challenger_id, opponent_id))
  where status in ('pending', 'active');

alter table public.duels enable row level security;

-- La tabla se toca solo desde el backend. El cliente lee el estado por la API.
revoke all on table public.duels from anon, authenticated;
grant select, insert, update on table public.duels to service_role;

drop policy if exists "Backend only duels" on public.duels;
create policy "Backend only duels"
  on public.duels
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- Realtime Authorization: el canal del duelo es privado y solo lo pueden usar
-- sus dos participantes mientras el duelo sigue vivo. El topic es el id del duelo.
-- ---------------------------------------------------------------------------
drop policy if exists "Duel participants read duel channel" on realtime.messages;
create policy "Duel participants read duel channel"
  on realtime.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.duels d
      where d.id::text = (select realtime.topic())
        and d.status in ('pending', 'active')
        and (select auth.uid()) in (d.challenger_id, d.opponent_id)
    )
  );

drop policy if exists "Duel participants write duel channel" on realtime.messages;
create policy "Duel participants write duel channel"
  on realtime.messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.duels d
      where d.id::text = (select realtime.topic())
        and d.status in ('pending', 'active')
        and (select auth.uid()) in (d.challenger_id, d.opponent_id)
    )
  );

-- countDuelRewardsSince filtra por winner_id + finished_at para el tope diario
-- de XP, y la FK duels_winner_id_fkey no tenia indice que la cubriera.
create index if not exists duels_winner_finished_idx
  on public.duels (winner_id, finished_at desc);
