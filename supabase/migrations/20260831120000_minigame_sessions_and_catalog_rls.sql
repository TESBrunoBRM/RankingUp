-- ---------------------------------------------------------------------------
-- 1. Anti-farmeo de XP en minijuegos
--    /v1/profile/minigame-xp otorgaba 50 XP por llamada sin ningun limite:
--    un usuario autenticado podia repetir la peticion en bucle y escalar el
--    ranking sin jugar. Registramos cada recompensa para poder aplicar un tope
--    diario en el backend.
-- ---------------------------------------------------------------------------
create table if not exists public.minigame_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null default 'push_ups',
  reps integer not null check (reps >= 0 and reps <= 10000),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now()
);

create index if not exists minigame_sessions_user_created_idx
  on public.minigame_sessions (user_id, created_at desc);

alter table public.minigame_sessions enable row level security;

-- Solo el backend (service_role) escribe aqui. El cliente nunca toca la tabla
-- directamente, para que el tope diario no se pueda esquivar.
revoke all on table public.minigame_sessions from anon, authenticated;
grant select, insert on table public.minigame_sessions to service_role;

drop policy if exists "Backend only minigame sessions" on public.minigame_sessions;
create policy "Backend only minigame sessions"
  on public.minigame_sessions
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- 2. Catalogo de ejercicios: RLS estaba activo pero sin ninguna politica
--    (advisor 0008_rls_enabled_no_policy). Lo dejamos explicito: catalogo
--    de solo lectura para usuarios autenticados, escritura solo backend.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated can read exercise catalog" on public.exercises;
create policy "Authenticated can read exercise catalog"
  on public.exercises
  for select
  to authenticated
  using (true);

grant select on table public.exercises to authenticated;
grant select, insert, update, delete on table public.exercises to service_role;
