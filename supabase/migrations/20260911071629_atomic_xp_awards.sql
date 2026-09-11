-- ---------------------------------------------------------------------------
-- XP atomico (V-02, V-03, V-04 de SECURITY-FINDINGS.md)
--
-- Las tres rutas que reparten XP hacian lo mismo desde la aplicacion:
--   1. leer profiles.xp,
--   2. comprobar el tope diario con un count(),
--   3. escribir el total absoluto.
--
-- Con peticiones concurrentes las dos ultimas se rompen:
--   * escribir un total absoluto calculado desde una lectura previa pisa la
--     escritura de otra peticion (XP perdido),
--   * N peticiones en paralelo leen el mismo contador antes de que ninguna
--     haya insertado, y todas superan el tope diario.
--
-- Aqui el tope deja de ser un `if` de TypeScript y pasa a ser una invariante de
-- la base de datos. La pieza clave es el `for update` sobre la fila del perfil:
-- serializa a los concurrentes del mismo usuario, de modo que el segundo espera
-- a que el primero confirme y entonces ya ve su recompensa contada.
--
-- Las tres funciones son security definer porque las tablas estan cerradas a
-- anon/authenticated: solo el backend (service_role) las invoca.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Incremento relativo. Sustituye a `update profiles set xp = <total>`.
--    `xp = xp + n` es atomico: dos concurrentes suman las dos, no se pisan.
-- ---------------------------------------------------------------------------
create or replace function public.increment_profile_xp(p_user_id uuid, p_amount int)
returns int
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set xp = coalesce(xp, 0) + p_amount
   where id = p_user_id
  returning xp;
$$;

revoke execute on function public.increment_profile_xp(uuid, int)
  from public, anon, authenticated;
grant execute on function public.increment_profile_xp(uuid, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Minijuego: contar, insertar la sesion y sumar el XP en una transaccion.
-- ---------------------------------------------------------------------------
create or replace function public.award_minigame_xp(
  p_user_id uuid,
  p_game text,
  p_reps int,
  p_xp int,
  p_daily_limit int
)
returns table (granted boolean, total_xp int, rewards_today int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_total int;
begin
  perform 1 from public.profiles where id = p_user_id for update;

  select count(*) into v_count
    from public.minigame_sessions
   where user_id = p_user_id
     and game = p_game
     and xp_awarded > 0
     and created_at >= now() - interval '24 hours';

  if v_count >= p_daily_limit then
    select coalesce(xp, 0) into v_total from public.profiles where id = p_user_id;
    return query select false, coalesce(v_total, 0), v_count;
    return;
  end if;

  insert into public.minigame_sessions (user_id, game, reps, xp_awarded)
  values (p_user_id, p_game, p_reps, p_xp);

  update public.profiles
     set xp = coalesce(xp, 0) + p_xp
   where id = p_user_id
  returning xp into v_total;

  return query select true, coalesce(v_total, 0), v_count + 1;
end;
$$;

revoke execute on function public.award_minigame_xp(uuid, text, int, int, int)
  from public, anon, authenticated;
grant execute on function public.award_minigame_xp(uuid, text, int, int, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. Duelos: mismo patron. `duels.xp_awarded` se escribe DENTRO de la misma
--    transaccion que el conteo; si se dejara para despues, dos duelos que
--    terminan a la vez contarian ambos cero y se saltarian el tope.
-- ---------------------------------------------------------------------------
create or replace function public.award_duel_xp(
  p_winner_id uuid,
  p_duel_id uuid,
  p_xp int,
  p_daily_limit int
)
returns table (granted boolean, total_xp int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_total int;
begin
  perform 1 from public.profiles where id = p_winner_id for update;

  select count(*) into v_count
    from public.duels
   where winner_id = p_winner_id
     and xp_awarded > 0
     and finished_at >= now() - interval '24 hours';

  if v_count >= p_daily_limit then
    select coalesce(xp, 0) into v_total from public.profiles where id = p_winner_id;
    return query select false, coalesce(v_total, 0);
    return;
  end if;

  update public.duels set xp_awarded = p_xp where id = p_duel_id;

  update public.profiles
     set xp = coalesce(xp, 0) + p_xp
   where id = p_winner_id
  returning xp into v_total;

  return query select true, coalesce(v_total, 0);
end;
$$;

revoke execute on function public.award_duel_xp(uuid, uuid, int, int)
  from public, anon, authenticated;
grant execute on function public.award_duel_xp(uuid, uuid, int, int)
  to service_role;
