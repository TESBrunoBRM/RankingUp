# RankingUp — Plan de mejoras: entrenamiento, progreso social, minijuego y racha

**Fecha:** 2026-09-14
**Rama base:** `codex/prototype-deploy`
**Referencia visual:** grabación de Symmetry de 75 s, analizada fotograma a fotograma (75 frames)
**Alcance:** 4 features independientes, entregables por separado

## Estado de implementación (14 sept 2026)

| Feature | Estado | Pendiente de aceptación |
|---|---|---|
| C — Retirada minijuego | Implementada: XP proporcional en NestJS, límite diario, validación de ritmo y UI de retirada | Probar cámara/recompensa en APK físico |
| D — Racha | Implementada: migración/RPC, check-in al abrir Home o volver a primer plano, badge y calendario | Probar cambio de día y zona horaria en dispositivo |
| A — Sesión activa | Implementada base: migración, RPC transaccional e idempotente, preview, XP/volumen/PR, cronómetro, borrador offline, descanso editable, teclado, resumen, historial con detalle y gráfica; subida de carga y descarga tras 2 fallos en backend | Probar recuperación al matar la app, cronómetro tras segundo plano y controles en APK físico |
| B — Progreso social | Implementada base: bucket privado, URL de subida firmada, edad 16+ para foto, publicación sin foto, feed en Home, perfil, likes y retiro con borrado de foto | Probar subida real y visibilidad con 3 cuentas; antes de tienda faltan reporte/bloqueo y términos de uso |

Migraciones aplicadas en Supabase: `20260914051808_activity_streak`,
`20260914051815_training_sessions`, `20260914051820_progress_posts` y
`20260914230105_recent_exercise_sessions`.
La CLI local no está vinculada al proyecto (`npx supabase migration list` falla);
el historial remoto fue comprobado mediante el conector de Supabase.
Tests unitarios: 20 suites / 101 tests. Typecheck móvil/API, build API y Expo Doctor
(18/18): verdes tras los últimos cambios. APK preview v4 compilado en EAS y descargado
en `artifacts/RankingUp-preview-v4.apk`; instalación y arranque sin excepción en
emulador Android API 35. Render sirve el commit `6d3e402` y las rutas nuevas
responden 401 sin token (no 404). Las capturas del emulador salen negras incluso
en Home de Android, por lo que la revisión visual y los flujos autenticados siguen
pendientes de un dispositivo físico/cuentas de prueba. Reporte, bloqueo y términos
deben completarse antes de publicar en tienda.

---

## 0. Cómo leer este plan

Cada feature está escrita para poder trabajarse sola: tiene su análisis del estado actual,
su migración, sus endpoints, sus pantallas y su checklist. No hay que hacerlas en orden
salvo por una dependencia real, que está marcada en §7.

Las rutas de archivo apuntan al código que hay hoy.

**Dos principios que este plan no rompe** (vienen del diseño de seguridad ya existente y
están documentados en [`SECURITY-FINDINGS.md`](SECURITY-FINDINGS.md)):

1. **La API es el único camino a Postgres.** Toda tabla nueva nace con RLS activo y
   `using (false)` para `anon`/`authenticated`; solo `service_role` escribe.
2. **El XP lo calcula el servidor, nunca el cliente.** El cliente puede mostrar una
   estimación, pero el número que se guarda lo decide NestJS.

---

## 1. Qué hace Symmetry exactamente (lo que se ve en el video)

El video son 75 s de una sesión de entrenamiento en curso (cronómetro interno 0:22 → 1:24)
y termina en la pantalla de publicación. Esto es el inventario literal de lo que aparece:

### 1.1 Pantalla de sesión activa

| Elemento | Detalle observado |
|---|---|
| Barra superior fija | Chevron para minimizar · cronómetro de sesión (`0:22`, corre en vivo) · logo circular · botón **Terminar** |
| Carrusel de ejercicios | Avatares circulares horizontales, **✓ azul** en los completados, **anillo blanco** en el actual |
| Media del ejercicio | Render 3D anatómico con el músculo objetivo resaltado en **cian** |
| Nombre + coaching | `Press De Banca Plano (Barra Recta)` + texto de intensidad propio del ejercicio |
| Fila de chips (scroll horizontal) | `▶ Tutorial` · `⇄ Reemplazar` · `✎ Notas` · `⏱ 1min` · `🗑 Borrar` · `⋮ Más` |
| Tabla de series | Columnas `SERIE · KG · REPES · ✓` + botón circular azul con icono de destello |
| Valores fantasma | KG/REPES en **gris** = objetivo o sesión anterior; pasan a **blanco** al escribir |
| Teclado propio | Teclado numérico in-app (no el del SO) con botones contextuales: `+2.5 / −2.5` en KG, `+1 / −1` en REPES, y `Siguiente` para saltar de campo |
| Ayuda contextual | Barra azul sobre el teclado: *"Registra el peso total (incluyendo la barra)"* / *"Registra el total de repes hechas"*, con ⓘ |
| Serie completada | La fila se pinta **azul** y el ✓ se rellena |
| Temporizador de descanso | Aparece abajo al completar: `🌙 Descanso 01:00` con `−15s`, `+15s` y `≫` (saltar). Cuenta atrás real |
| Tipos de serie | Tap en el nº de serie → bottom sheet **"Seleccionar Tipo de Serie"**: `1 Normal` · `W Calentamiento` (naranja) · `D Descendente` (morado) · `F Al Fallo` (rojo), cada uno con `?`, y `✕ Eliminar serie` |
| Menú "Más" | Bottom sheet: *Editar tiempo de descanso – 1min* · *Reemplazar* · *Añadir a superserie* · *Ver indicaciones* · *Cómo registrar el peso* · *Ver historial y analíticas* · *Eliminar* |
| Sobrecarga progresiva | El botón de destello abre **"¿Aplicar sobrecarga progresiva inteligente?"** — *"Symmetry Intelligence calcula el peso y repeticiones por ti para maximizar tu progreso y minimizar la fatiga"*. Muestra `80 kg × 8` → `85 kg × 6`. Botones **Ok** y **Obtener Pro** → **es feature de pago** |
| Añadir serie | `+ Añadir serie` al final de la tabla |

### 1.2 Pantalla "¡Entrenamiento completado!" (= publicar progreso)

**Este es el hallazgo importante del video**: en Symmetry *publicar el progreso no es un
post suelto en un feed*. Es la propia pantalla de cierre de la sesión. La foto y la
descripción son campos del entrenamiento terminado.

```
←  ¡Entrenamiento completado!

Nombre
Entrenamiento del Lunes                        ← editable

Duración      Volumen      Series
1min          2400 kg      3                   ← Duración en azul (acento)

Fecha
14 sept 2026, 1:03 a. m.

┌───────────┐
│    🖼+    │   ¡Añade una foto o video
└───────────┘   para ver tu progreso con el tiempo!

Descripción
¿Cómo ha ido tu entrenamiento? Comparte tus pensamientos aquí…

Visibilidad del Entrenamiento          Solo Seguidores  >

[        Terminar entrenamiento        ]
          Descartar entrenamiento                        ← rojo
```

**Consecuencia de diseño para RankingUp:** el post de progreso debe colgar del
`workout_log`, no ser una entidad social aparte. Eso da gratis el volumen, la duración
y las series como metadatos del post, y elimina la pregunta "¿qué publico?".

### 1.3 Qué NO copiamos, y por qué

| Elemento de Symmetry | Decisión | Motivo |
|---|---|---|
| Renders 3D con músculo en cian | **No** | Assets 3D con licencia comercial. RankingUp ya tiene GIFs del catálogo (`gifUrl`), con su atribución a Gym visual. Se reutilizan esos |
| Sobrecarga progresiva "inteligente" | **Sí, pero determinista y gratis** | En Symmetry es un gancho de paywall. En RankingUp se puede hacer con una regla determinista sobre el historial, sin IA ni coste. Ver §3.5 |
| Superseries | **Fuera de v1** | Complica el modelo de datos (agrupación de ejercicios) y no aparece en lo que pediste |
| "Obtener Pro" / paywall | **No** | RankingUp no tiene monetización |

---

## 2. Punto de partida de RankingUp

### 2.1 Lo que ya existe y sirve

- [`LogWorkoutScreen.tsx`](src/screens/LogWorkoutScreen.tsx) (458 líneas): tabla de series con peso/reps y check de completado, animación de XP al guardar.
- [`workouts.service.ts`](apps/api/src/workouts/workouts.service.ts): `logSession` resuelve el músculo de cada ejercicio, calcula XP y persiste `workout_logs` + `exercise_logs`.
- [`xp.rules.ts`](apps/api/src/domain/xp.rules.ts): 15/10/5 XP por músculo y serie, tope `MAX_SESSION_XP = 300`.
- [`strength.calculator.ts`](apps/api/src/domain/strength.calculator.ts): ya calcula 1RM estimado y nivel de fuerza por ejercicio. **Se reutiliza tal cual para detectar récords.**
- Catálogo de 1.324 ejercicios con `instructions_es`, `steps_es`, `gif_path`, `target`.
- `expo-image-picker` y `expo-image-manipulator` **ya están en [`package.json`](package.json)** — no hay que instalar nada para las fotos.
- `expo-keep-awake` ya está instalado — se necesita para que la pantalla no se apague durante la sesión.
- `react-native-svg` ya está instalado — sirve para las gráficas de progreso.
- RPC atómicas de XP ya en producción ([`20260911071629_atomic_xp_awards.sql`](supabase/migrations/20260911071629_atomic_xp_awards.sql)).

### 2.2 Las carencias concretas frente al video

| # | Carencia | Evidencia en el código |
|---|---|---|
| C1 | No existe el concepto de *sesión en curso*: ni inicio, ni duración, ni cronómetro | `workout_logs` solo tiene `date`; se escribe al guardar, no al empezar |
| C2 | No se ve qué levantaste la vez anterior | `exercise_logs` se escribe pero **nunca se lee por ejercicio**; solo se agrega en `/v1/ranking` |
| C3 | Sin temporizador de descanso | No hay nada en `LogWorkoutScreen` |
| C4 | Sin tipos de serie (calentamiento / descendente / al fallo) | `exercise_logs` no tiene columna de tipo |
| C5 | Sin volumen ni récords ni resumen de sesión | `logSession` solo devuelve `gainedXp` y `totalXp` |
| C6 | Al guardar, la app salta sola al ranking a los 2,8 s | `LogWorkoutScreen.tsx:140` — desorienta y tapa el resumen |
| C7 | Si cierras la app a mitad de sesión, pierdes todo | No hay borrador local |
| C8 | Sin historial de sesiones ni gráfica por ejercicio | `workout_logs` no se consulta nunca |
| C9 | Sin fotos: **no hay ningún bucket de Storage creado** | Verificado: `select * from storage.buckets` → 0 filas |
| C10 | Teclado del SO, con los problemas típicos de `keyboardType="numeric"` en Android | `TextInput` planos |

---

## 3. Feature A — Sesión de entrenamiento en vivo

> **Objetivo:** convertir `LogWorkoutScreen` en una sesión con cronómetro, referencia de
> la vez anterior, descanso automático, tipos de serie y resumen final.

### 3.1 Migración `2026MMDDHHMMSS_training_sessions.sql`

Aditiva e idempotente, al estilo de las migraciones que ya hay (el README avisa de que la
migración base aún no se capturó con `db pull`, así que **nada de recrear tablas**).

```sql
-- Sesión: duración y métricas agregadas
alter table public.workout_logs
  add column if not exists started_at       timestamptz,
  add column if not exists finished_at      timestamptz,
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 86400),
  add column if not exists total_volume     numeric(10,2) not null default 0,
  add column if not exists xp_awarded       integer not null default 0,
  add column if not exists name             text;

create index if not exists workout_logs_user_date_idx
  on public.workout_logs (user_id, date desc);

-- Serie: orden, tipo y marca de récord
do $$ begin
  if not exists (select 1 from pg_type where typname = 'set_kind') then
    create type public.set_kind as enum ('normal', 'warmup', 'drop', 'failure');
  end if;
end $$;

alter table public.exercise_logs
  add column if not exists set_index  smallint not null default 1,
  add column if not exists kind       public.set_kind not null default 'normal',
  add column if not exists is_pr      boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

-- Descanso configurable por ejercicio de la rutina
alter table public.workout_exercises
  add column if not exists rest_seconds smallint not null default 90
    check (rest_seconds between 0 and 600);
```

**Nota sobre el enum:** `warmup` y `drop` **no deben contar para el XP ni para los
récords**. Eso se implementa en el dominio (§3.3), no en la BD.

### 3.2 RPC para "lo que hiciste la vez anterior"

PostgREST no sabe hacer `distinct on`, así que va como función. Mismo patrón
`security definer` + `revoke`/`grant to service_role` que las RPC de XP existentes.

```sql
create or replace function public.get_last_exercise_performance(
  p_user_id uuid,
  p_exercise_ids text[]
)
returns table (
  exercise_id text,
  last_date   timestamptz,
  sets        jsonb,
  best_weight numeric,
  best_reps   integer
)
language sql
security definer
set search_path = ''
as $$
  with ultima_sesion as (
    select distinct on (el.exercise_id)
           el.exercise_id, wl.id as log_id, wl.date
      from public.exercise_logs el
      join public.workout_logs  wl on wl.id = el.workout_log_id
     where wl.user_id = p_user_id
       and el.exercise_id = any(p_exercise_ids)
       and el.kind = 'normal'
     order by el.exercise_id, wl.date desc
  ),
  mejor_marca as (
    select el.exercise_id,
           max(el.weight) as best_weight,
           max(el.reps)   as best_reps
      from public.exercise_logs el
      join public.workout_logs  wl on wl.id = el.workout_log_id
     where wl.user_id = p_user_id
       and el.exercise_id = any(p_exercise_ids)
       and el.kind = 'normal'
     group by el.exercise_id
  )
  select u.exercise_id,
         u.date,
         (select jsonb_agg(jsonb_build_object('setIndex', e.set_index, 'weight', e.weight, 'reps', e.reps)
                   order by e.set_index)
            from public.exercise_logs e
           where e.workout_log_id = u.log_id and e.exercise_id = u.exercise_id),
         m.best_weight,
         m.best_reps
    from ultima_sesion u
    left join mejor_marca m using (exercise_id);
$$;

revoke execute on function public.get_last_exercise_performance(uuid, text[])
  from public, anon, authenticated;
grant execute on function public.get_last_exercise_performance(uuid, text[])
  to service_role;
```

### 3.3 Dominio (NestJS) — `apps/api/src/domain/session.rules.ts` (nuevo)

```ts
/** Volumen = Σ peso × reps de las series que cuentan. */
export const calculateVolume = (sets: SessionSet[]): number =>
  sets
    .filter((s) => s.kind === 'normal' || s.kind === 'failure')
    .reduce((total, s) => total + s.weight * s.reps, 0);

/** Récord = supera el mejor 1RM estimado previo del ejercicio. */
export const detectPersonalRecords = (
  sets: SessionSet[],
  previousBests: Map<string, number>,
): PersonalRecord[] => { /* reutiliza estimateOneRepMax de strength.calculator.ts */ };
```

**Reglas de XP (ampliación de [`xp.rules.ts`](apps/api/src/domain/xp.rules.ts)):**

- Las series `warmup` y `drop` **no suman XP** → hay que filtrarlas antes de llamar a `calculateWorkoutXp`.
- Bonus de récord: `+10 XP` por récord, **máximo 30 por sesión**.
- `MAX_SESSION_XP = 300` sigue siendo el techo absoluto, aplicado **después** del bonus.
  Sin esto, marcar 60 series como récord sería un vector de inflado de ranking.

Tests nuevos en `session.rules.spec.ts` y ampliación de `xp.rules.spec.ts`.

### 3.4 API

| Método | Ruta | Devuelve |
|---|---|---|
| `GET` | `/v1/workouts/:workoutId/session-preview` | Ejercicios + descanso + `lastPerformance` por ejercicio (RPC de §3.2) |
| `POST` | `/v1/workouts/log-session` | **Ampliado.** Acepta `startedAt`, `durationSeconds`, `name`, `notes`, y por serie `setIndex` + `kind`. Devuelve el resumen completo |
| `GET` | `/v1/workouts/history?cursor=` | Lista paginada de sesiones con duración, volumen, series, XP |
| `GET` | `/v1/workouts/history/:logId` | Detalle de una sesión |
| `GET` | `/v1/exercises/progress?name=` | Serie temporal para la gráfica: `[{ date, bestWeight, estimatedOneRm, volume }]` |

**Respuesta ampliada de `log-session`** (esto es lo que alimenta la pantalla de resumen):

```ts
{
  workoutLogId: string;
  gainedXp: number;          // ya existía
  totalXp: number;           // ya existía
  durationSeconds: number;
  totalVolume: number;
  setsCompleted: number;
  personalRecords: Array<{ exerciseId: string; previous: number; current: number }>;
}
```

**Compatibilidad:** los campos nuevos del DTO van **opcionales** (`@IsOptional()`), para
que un APK viejo que solo manda `workoutId` + `sets` siga funcionando contra la API nueva.
Es importante: ya hay un APK `preview` distribuido.

**Throttle:** `/v1/workouts/log-session` ya tiene `@Throttle(10/min)`. Los `GET` nuevos van con el global.

### 3.5 Sugerencia de carga (el equivalente al botón de destello, sin IA ni paywall)

Regla determinista, en `apps/api/src/domain/progression.rules.ts`:

```
si completaste TODAS las series objetivo la última vez
   y las reps de la última serie >= reps objetivo
   → sube el peso: +2,5 kg (tren superior) / +5 kg (tren inferior)
si fallaste reps en 2 sesiones seguidas
   → baja un 10 % y sugiere volver a subir
si no hay historial
   → no sugieras nada (deja el campo vacío)
```

Se expone dentro de `session-preview` como `suggestion: { weight, reps, reason }`, y la UI
la muestra como valor fantasma con un icono. **Gratis, explicable y testeable** — al
contrario que la caja negra de Symmetry.

### 3.6 Frontend

#### Pantallas nuevas

| Archivo | Rol |
|---|---|
| `src/screens/ActiveSessionScreen.tsx` | Sustituye a `LogWorkoutScreen`. Sesión en vivo |
| `src/screens/SessionSummaryScreen.tsx` | "¡Entrenamiento completado!" — **es también la pantalla de publicación** (§4) |
| `src/screens/WorkoutHistoryScreen.tsx` | Historial de sesiones |
| `src/screens/ExerciseProgressScreen.tsx` | Gráfica por ejercicio (`react-native-svg`) |

#### Componentes nuevos

| Archivo | Rol |
|---|---|
| `src/components/SessionTimer.tsx` | Cronómetro de sesión, `useRef` + `setInterval`, resistente a background |
| `src/components/RestTimerBar.tsx` | Barra inferior `🌙 Descanso 01:00` con `−15s`, `+15s`, `≫`. Vibración al terminar |
| `src/components/NumericKeypad.tsx` | Teclado propio con `+2.5/−2.5` y `+1/−1`, `Siguiente`, y barra de ayuda contextual |
| `src/components/SetTypeSheet.tsx` | Bottom sheet de tipos de serie con los badges `1 / W / D / F` |
| `src/components/ExerciseCarousel.tsx` | Avatares horizontales con ✓ y anillo del actual |

#### Detalles de implementación que importan

- **Persistencia del borrador.** `AsyncStorage` con clave `session:draft:<workoutId>`, guardando en cada cambio con debounce de 500 ms. Al montar, si hay borrador de menos de 6 h, ofrecer "Retomar sesión". Esto resuelve C7 y es lo que más se nota en uso real.
- **`expo-keep-awake`**: `useKeepAwake()` mientras la sesión esté activa.
- **Cronómetro con `Date.now()`, no acumulando ticks.** Guardar `startedAt` y calcular `elapsed = Date.now() - startedAt` en cada render; si no, Android congela el intervalo en segundo plano y el tiempo se queda corto.
- **Quitar el auto-navigate al ranking** de `LogWorkoutScreen.tsx:140`. Ahora se navega al resumen, y desde ahí el usuario decide.
- **Paleta:** Symmetry usa azul (`#0A84FF`) como acento. RankingUp usa lima (`#CCFF00`) — **mantener la lima**, no copiar el azul. El fondo `#101114` y los bordes `#2B2E35` ya coinciden con la estética del video.
- **Media:** usar `gifUrl` del catálogo con la atribución a Gym visual visible, como ya hace `AddExercisesScreen`.
- **Coaching text:** usar `instructions_es` del catálogo truncado a ~3 líneas. No inventar textos nuevos por ejercicio (son 1.324).

### 3.7 Checklist de Feature A

- [ ] Migración aplicada y `npx supabase migration list` en verde
- [ ] RPC `get_last_exercise_performance` con `revoke`/`grant` correctos
- [ ] `session.rules.spec.ts` + `progression.rules.spec.ts` en verde
- [ ] Campos nuevos del DTO opcionales (APK viejo sigue funcionando)
- [ ] Series `warmup`/`drop` no suman XP — test explícito
- [ ] Tope `MAX_SESSION_XP` respetado incluso con bonus de récord — test explícito
- [ ] Borrador se recupera tras matar la app a mitad de sesión
- [ ] Cronómetro correcto tras 5 min con la app en segundo plano

---

## 4. Feature B — Publicar el progreso (foto + descripción)

> **Decisión de diseño, tomada a partir del video:** el post de progreso **cuelga del
> `workout_log`**. No hay entidad "post" independiente en v1. Esto simplifica todo y
> además es exactamente el flujo que viste en Symmetry.

### 4.1 Storage

**No hay ningún bucket creado** (verificado contra el proyecto `mpshqfizadislsqjispd`).
Hay que crearlo, y **privado**:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
```

**Por qué privado y no público:** son fotos de progreso físico de personas. Un bucket
público significa que cualquiera con la URL las ve para siempre, sin sesión, sin poder
revocarlo, e indexables. Con bucket privado la API firma URLs temporales (TTL 1 h) y
respeta la visibilidad que eligió el usuario.

**Rutas:** `progress-photos/{user_id}/{workout_log_id}/{uuid}.jpg`. El prefijo por usuario
permite validar en el backend que nadie referencia el objeto de otro.

**Subida:** `createSignedUploadUrl` desde la API → el móvil hace `PUT` directo a Supabase.
Los bytes **no pasan por Render** (plan gratuito, memoria y ancho de banda limitados).

### 4.2 Migración `2026MMDDHHMMSS_progress_posts.sql`

```sql
do $$ begin
  if not exists (select 1 from pg_type where typname = 'post_visibility') then
    create type public.post_visibility as enum ('public', 'followers', 'private');
  end if;
end $$;

alter table public.workout_logs
  add column if not exists description  text,
  add column if not exists photo_path   text,
  add column if not exists visibility   public.post_visibility not null default 'followers',
  add column if not exists published_at timestamptz;

create index if not exists workout_logs_feed_idx
  on public.workout_logs (user_id, published_at desc)
  where published_at is not null;

-- Likes
create table if not exists public.workout_log_likes (
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  user_id        uuid not null references public.profiles(id)     on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (workout_log_id, user_id)
);

create index if not exists workout_log_likes_user_idx
  on public.workout_log_likes (user_id, created_at desc);

alter table public.workout_log_likes enable row level security;
revoke all on table public.workout_log_likes from anon, authenticated;
grant select, insert, delete on table public.workout_log_likes to service_role;

drop policy if exists "Backend only workout log likes" on public.workout_log_likes;
create policy "Backend only workout log likes"
  on public.workout_log_likes for all to anon, authenticated
  using (false) with check (false);
```

`visibility` por defecto `followers`, igual que Symmetry ("Solo Seguidores") — es el
default privado-por-defecto correcto.

### 4.3 API — módulo `apps/api/src/progress/`

| Método | Ruta | Nota |
|---|---|---|
| `POST` | `/v1/progress/upload-url` | Body: `{ workoutLogId, contentType, sizeBytes }`. Valida propiedad del log, mime y tamaño. Devuelve `{ uploadUrl, path, token }`. `@Throttle(10/min)` |
| `PATCH` | `/v1/progress/:workoutLogId` | Body: `{ description?, photoPath?, visibility?, name? }`. **Verifica que `photoPath` empieza por `{userId}/` y que el objeto existe en Storage** antes de guardarlo |
| `GET` | `/v1/progress/feed?cursor=` | Sesiones publicadas propias + de a quién sigues, respetando `visibility`. URLs firmadas a 1 h |
| `GET` | `/v1/progress/profile/:profileId?cursor=` | Grid del perfil público |
| `POST` / `DELETE` | `/v1/progress/:workoutLogId/like` | |
| `DELETE` | `/v1/progress/:workoutLogId/photo` | Borra el objeto de Storage y limpia `photo_path` |

**Reglas de visibilidad, en el servidor y solo en el servidor:**

```
public     → cualquier usuario autenticado
followers  → el autor + quien le sigue (public.profile_follows)
private    → solo el autor
```

Además: si `profiles.is_public = false`, ninguna sesión suya sale en el feed de terceros,
aunque el post sea `public`. La bandera de perfil manda sobre la del post.

**Validación de `photoPath` — esto es lo importante.** Sin ella, un cliente podría mandar
`photoPath = "<uuid-de-otro>/..."` y hacer que la API firme la foto de otra persona.
La comprobación es literal: `path.startsWith(userId + '/')` **más** un `head` al objeto.

### 4.4 Frontend

- **`SessionSummaryScreen`** (la misma de §3.6) gana:
  - Slot de foto con borde discontinuo y copy tipo *"¡Añade una foto para ver tu progreso con el tiempo!"*
  - `TextInput` multilínea de descripción, placeholder *"¿Cómo ha ido tu entrenamiento?"*
  - Selector de visibilidad (`Público` / `Solo seguidores` / `Privado`), default seguidores
  - `Terminar entrenamiento` (primario) y `Descartar entrenamiento` (rojo, con confirmación)
- **Pipeline de imagen**, con lo que ya está instalado:
  ```
  expo-image-picker  (galería o cámara, permisos)
    → expo-image-manipulator  (resize al lado mayor 1440 px, JPEG quality 0.7)
    → POST /v1/progress/upload-url
    → PUT directo a Supabase Storage
    → PATCH /v1/progress/:id con el path
  ```
  Una foto de 4 MB del carrete queda en ~250 KB. Sin este paso, subir por 4G desde el
  gimnasio falla o tarda demasiado.
- **`ProgressFeedScreen`**: `FlatList` con cards (autor, fecha, foto, descripción, duración/volumen/series, like). Entra como sección en Home o como pestaña; ver §8.
- **`PublicProfileScreen`** y **`ProfileScreen`**: grid de 3 columnas con las fotos publicadas.

### 4.5 Lo que hay que decidir antes de publicar esto en una tienda

No es opcional: es contenido generado por usuarios con fotos de personas.

- [ ] Botón de **reportar** post y de **bloquear** usuario
- [ ] **Borrado real**: al borrar el post hay que borrar el objeto de Storage, no solo la fila
- [ ] Términos de uso que prohíban desnudos y contenido de terceros sin consentimiento
- [ ] Edad mínima: `profiles.age` admite desde 10 años. Un feed social con fotos y menores de 13 activa COPPA en EE. UU. y equivalentes en la UE. **Recomendación: restringir la publicación de fotos a mayores de 16**, comprobado en el backend

### 4.6 Checklist de Feature B

- [ ] Bucket privado creado, límite 5 MB, mimes restringidos
- [ ] `photoPath` validado contra el prefijo del usuario — test explícito con un path ajeno
- [ ] Visibilidad probada con 3 cuentas: autor, seguidor, extraño
- [ ] `is_public = false` oculta las sesiones aunque el post sea `public`
- [ ] Foto de 4 MB queda bajo 400 KB tras el pipeline
- [ ] Borrar el post borra también el objeto de Storage

---

## 5. Feature C — Retirarse del minijuego de flexiones

> **Objetivo:** poder abandonar antes de las 100 flexiones y cobrar el XP proporcional.

### 5.1 Estado actual

| Pieza | Hoy |
|---|---|
| [`pushUpGame.ts`](src/constants/pushUpGame.ts) | `PUSH_UP_VICTORY_TARGET = 100`, 6 monstruos con 8+12+15+18+22+25 = **100 HP** |
| [`reward-minigame.dto.ts`](apps/api/src/profiles/dto/reward-minigame.dto.ts) | `@Equals(100)` — el servidor rechaza cualquier otro valor |
| [`profiles.service.ts`](apps/api/src/profiles/profiles.service.ts) | `MINIGAME_XP_REWARD = 50` fijo, `MINIGAME_DAILY_REWARD_LIMIT = 5` |
| RPC `award_minigame_xp` | **Ya recibe `p_xp` como parámetro** → **no hace falta migración** |
| [`PushUpsGameScreen.tsx`](src/screens/PushUpsGameScreen.tsx) | Solo hay `✕` (cerrar) en el header, que descarta todo sin recompensa |

Hay precedente para el gesto: los duelos ya tienen `forfeit` en
`apps/api/src/duels/duels.service.ts:275`.

### 5.2 Fórmula de XP

```
XP = floor(reps × 0,4) + (reps >= 100 ? 10 : 0)
```

| Reps | XP |
|---|---|
| 9 | 0 (bajo el mínimo) |
| 10 | 4 |
| 25 | 10 |
| 50 | 20 |
| 99 | 39 |
| **100** | **50** |

Dos propiedades buscadas:

1. **Completar sigue valiendo 50 XP** — no se devalúa el logro actual ni se rompe la
   economía de XP ya desplegada.
2. **Retirarse paga estrictamente menos por flexión** (0,4 vs 0,5) — el bonus de 10 por
   derrotar al jefe final mantiene el incentivo de llegar al final.

Umbral mínimo: `MINIGAME_MIN_REWARDED_REPS = 10`. Por debajo, XP 0.

### 5.3 Interacción con el tope diario

La RPC `award_minigame_xp` cuenta solo las filas con `xp_awarded > 0`:

```sql
where ... and xp_awarded > 0 and created_at >= now() - interval '24 hours'
```

Eso da el comportamiento correcto **sin tocar la migración**:

- Retirada con XP > 0 → **consume** uno de los 5 cupos diarios.
- Retirada bajo el umbral (XP 0) → se registra la sesión para estadísticas pero **no**
  consume cupo.

Sin esta regla, alguien haría 200 partidas de 10 flexiones y acumularía 800 XP/día,
frente a los 250 XP/día que es el máximo de hoy. El máximo diario **se mantiene en 250**.

### 5.4 Anti-trampas: qué cambia y qué no

Hay que ser honesto sobre esto: **el `@Equals(100)` de hoy no impide hacer trampa**. La
detección de flexiones corre en el WebView del móvil; cualquiera puede llamar a
`POST /v1/profile/minigame-xp` con `reps: 100` sin hacer una sola flexión. El cambio no
abre un agujero nuevo, solo convierte una mentira binaria en una continua.

Lo que sí conviene añadir, porque es barato:

```ts
// reward-minigame.dto.ts
@IsInt() @Min(1) @Max(100)   reps!: number;
@IsInt() @Min(3) @Max(3600)  durationSeconds!: number;
@IsIn(['completed', 'retired']) outcome!: 'completed' | 'retired';
```

```ts
// profiles.service.ts — ritmo imposible
const MAX_REPS_PER_SECOND = 1.5;  // el récord mundial ronda 1,3/s en ráfaga corta
if (reps / durationSeconds > MAX_REPS_PER_SECOND) {
  throw new BadRequestException('El ritmo reportado no es posible.');
}
```

**La defensa real sigue siendo el tope diario de 5 recompensas**, que no cambia.

### 5.5 Cambios concretos

| Archivo | Cambio |
|---|---|
| `apps/api/src/domain/minigame.rules.ts` | **Nuevo.** `calculateMinigameXp(reps)` + constantes |
| `apps/api/src/domain/minigame.rules.spec.ts` | **Nuevo.** Tabla de §5.2 como casos |
| [`reward-minigame.dto.ts`](apps/api/src/profiles/dto/reward-minigame.dto.ts) | Quitar `@Equals(100)`, añadir `Min/Max`, `durationSeconds`, `outcome` |
| [`profiles.service.ts`](apps/api/src/profiles/profiles.service.ts) | `rewardMinigameXp` calcula el XP, valida el ritmo, gestiona el caso XP 0 sin lanzar 429 |
| `apps/api/src/profiles/profiles.service.spec.ts` | Casos: retirada con XP, retirada bajo umbral, ritmo imposible, tope alcanzado |
| [`rankingUpApiClient.ts`](src/services/rankingUpApiClient.ts) | `rewardMinigameXp(reps, durationSeconds, outcome)` |
| [`pushUpGame.ts`](src/constants/pushUpGame.ts) | `MINIGAME_XP_PER_REP = 0.4`, `MINIGAME_COMPLETION_BONUS = 10`, `MINIGAME_MIN_REWARDED_REPS = 10` |
| [`PushUpsGameScreen.tsx`](src/screens/PushUpsGameScreen.tsx) | Botón **RETIRARME**, modal de confirmación, variante "retirada" de la pantalla de victoria |

### 5.6 UI de la retirada

- Botón `RETIRARME` en la `controlBar` inferior, estilo secundario (borde `#FF496C`, no relleno) para que no compita con el juego.
- **Modal de confirmación** mostrando lo que se pierde y lo que se gana:
  > **¿Retirarte ahora?**
  > Llevas **37 flexiones** y has derrotado a 3 de 6 monstruos.
  > Recibirás **≈14 XP**. Si llegas a 100 te llevas 50 XP.
  > `[ SEGUIR ]` `[ RETIRARME ]`
- El XP proyectado se muestra en vivo en el header (`+14 XP`) junto al contador `37/100`.
  Es una **estimación del cliente**; el número definitivo lo devuelve el servidor.
- Caso `reps === 0`: no llamar a la API, solo `goBack()`.
- Reutilizar la pantalla de victoria con copy alternativo: *"TE RETIRASTE"* + *"Derrotaste a N de 6 monstruos con X flexiones"*, manteniendo la `rewardCard`.

### 5.7 Checklist de Feature C

- [ ] `calculateMinigameXp` cubierta con la tabla completa de §5.2
- [ ] 100 reps siguen dando exactamente 50 XP (no hay regresión)
- [ ] Retirada con XP > 0 consume cupo diario; con XP 0 no lo consume
- [ ] Ritmo imposible rechazado con 400
- [ ] Máximo diario sigue siendo 250 XP
- [ ] No hace falta migración — confirmado contra `award_minigame_xp`

---

## 6. Feature D — Racha de días en Home

> **Objetivo:** icono de racha en Home que cuente los días seguidos usando la app.

### 6.1 La decisión difícil: zonas horarias

Es la única parte de esta feature que tiene trampa. **El cliente no puede mandar la
fecha local**, porque entonces bastaría con enviar 30 fechas consecutivas futuras para
fabricar una racha de 30 días.

**Solución:** el cliente manda el **nombre de zona IANA**, el servidor calcula la fecha.

```ts
// El móvil ya usa Intl (HomeScreen formatea con 'es-CL'), así que esto funciona:
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; // 'America/Santiago'
```

```ts
// Servidor: validar contra la lista real y calcular la fecha local
if (!Intl.supportedValuesOf('timeZone').includes(dto.timeZone)) {
  throw new BadRequestException('Zona horaria no válida.');
}
const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: dto.timeZone })
  .format(new Date()); // → '2026-09-14'
```

Con esto la fecha nunca viene del cliente y no hay racha falsificable.

### 6.2 Qué cuenta como "día activo"

Literalmente pediste *"días en la que se utiliza la app"*. En v1 se implementa así, con un
check-in explícito al abrir Home. Es lo más simple, lo más fiel a lo que pediste, y evita
tener que meter la zona horaria dentro de tres servicios distintos.

Queda anotado como evolución: en v2, `logSession`, `rewardMinigameXp` y el cierre de
duelos también marcan el día, usando la zona guardada en `profiles.streak_timezone`.

### 6.3 Migración `2026MMDDHHMMSS_activity_streak.sql`

```sql
create table if not exists public.user_activity_days (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  sources       text[] not null default '{}',
  created_at    timestamptz not null default now(),
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

-- Contadores desnormalizados, para que Home no tenga que agregar nada
alter table public.profiles
  add column if not exists current_streak     integer not null default 0,
  add column if not exists longest_streak     integer not null default 0,
  add column if not exists last_activity_date date,
  add column if not exists streak_timezone    text;
```

### 6.4 RPC atómica

Mismo patrón `for update` que las RPC de XP: sin el bloqueo, dos peticiones simultáneas
del mismo usuario contarían el día dos veces.

```sql
create or replace function public.record_activity_day(
  p_user_id    uuid,
  p_local_date date,
  p_source     text
)
returns table (current_streak int, longest_streak int, is_new_day boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last    date;
  v_current int;
  v_longest int;
begin
  perform 1 from public.profiles where id = p_user_id for update;

  insert into public.user_activity_days (user_id, activity_date, sources)
  values (p_user_id, p_local_date, array[p_source])
  on conflict (user_id, activity_date) do update
    set sources = (select array_agg(distinct s)
                     from unnest(public.user_activity_days.sources || p_source) s);

  select last_activity_date, coalesce(current_streak, 0), coalesce(longest_streak, 0)
    into v_last, v_current, v_longest
    from public.profiles where id = p_user_id;

  if v_last is null then
    v_current := 1;
  elsif p_local_date = v_last then
    null;                                   -- mismo día, no toca nada
  elsif p_local_date = v_last + 1 then
    v_current := v_current + 1;             -- día consecutivo
  elsif p_local_date > v_last then
    v_current := 1;                         -- se rompió la racha
  end if;
  -- p_local_date < v_last (viaje o desfase de reloj): no se toca nada

  v_longest := greatest(v_longest, v_current);

  update public.profiles
     set current_streak     = v_current,
         longest_streak     = v_longest,
         last_activity_date = greatest(coalesce(v_last, p_local_date), p_local_date)
   where id = p_user_id;

  return query select v_current, v_longest, (v_last is distinct from p_local_date);
end;
$$;

revoke execute on function public.record_activity_day(uuid, date, text)
  from public, anon, authenticated;
grant execute on function public.record_activity_day(uuid, date, text)
  to service_role;
```

### 6.5 API — módulo `apps/api/src/streak/`

| Método | Ruta | Nota |
|---|---|---|
| `POST` | `/v1/streak/check-in` | Body `{ timeZone }`. `@Throttle(10/min)`. Devuelve `{ currentStreak, longestStreak, isNewDay }` |
| `GET` | `/v1/streak` | `{ current, longest, lastActivityDate, days: [{ date, active }] }` (últimos 35 días, para el calendario) |

Además, **incluir `streak` en la respuesta de `/v1/dashboard`**
([`dashboard.service.ts`](apps/api/src/dashboard/dashboard.service.ts)) para que Home no
haga una petición extra en el arranque en frío de Render.

### 6.6 Frontend

- **`src/components/StreakBadge.tsx`**: icono `flame` + número. Color `#FF9F0A` cuando la
  racha está viva, `#6D7681` apagado cuando es 0.
- **Ubicación en [`HomeScreen.tsx`](src/screens/HomeScreen.tsx):** en el `header`, a la
  izquierda del `profileButton`. Hay sitio (el header es `flexDirection: 'row'` con
  `headerCopy` en `flex: 1`). **No** meterlo en la `summaryBand`, que ya tiene 3 columnas
  y se quedaría estrecha.
- **Check-in:** en `useFocusEffect` de Home, pero **una vez por día local**. Guardar en
  `AsyncStorage` (`streak:lastCheckIn`) la última fecha enviada y comparar antes de llamar.
  Sin esto se manda una petición en cada foco de pantalla.
- **Animación al incrementar:** cuando `isNewDay === true`, reutilizar el patrón `Animated`
  que ya hay en Home para el splash (scale 0,9 → 1,1 → 1) más una vibración corta.
- **Tap → modal** con el calendario de los últimos 35 días (7 columnas × 5 filas), cada día
  encendido en lima. Opcional, pero es lo que hace que la racha enganche.

### 6.7 Checklist de Feature D

- [ ] El cliente **nunca** manda una fecha — solo la zona IANA
- [ ] Zona horaria validada contra `Intl.supportedValuesOf('timeZone')`
- [ ] Dos check-ins simultáneos no cuentan el día dos veces (test de concurrencia)
- [ ] Cambiar la hora del teléfono hacia atrás no rompe ni infla la racha
- [ ] Check-in una sola vez por día local, verificado con el log de la API
- [ ] `streak` viaja dentro de `/v1/dashboard` (sin petición extra en Home)

---

## 7. Orden de trabajo sugerido

Solo hay **una dependencia real**: la pantalla de publicación (B) es la pantalla de
resumen de sesión (A). Todo lo demás es paralelizable.

| Fase | Contenido | Por qué aquí |
|---|---|---|
| **1** | **Feature C** (retirada del minijuego) | Sin migración, aislada, ~1 día. Entrega valor inmediato y no bloquea nada |
| **2** | **Feature D** (racha) | Independiente, toca 2 archivos del front. Es lo que más se nota en la primera pantalla |
| **3** | **Feature A**, parte backend | Migración + RPC + `session-preview` + `log-session` ampliado + tests |
| **4** | **Feature A**, parte frontend | `ActiveSessionScreen`, teclado, temporizador de descanso, tipos de serie |
| **5** | **Feature A**, resumen + historial | `SessionSummaryScreen` sin foto todavía, `WorkoutHistoryScreen`, gráfica |
| **6** | **Feature B** | Bucket + endpoints + foto/descripción/visibilidad sobre la pantalla de la fase 5 |
| **7** | Feed y grid de perfil | La parte social pura, una vez que ya hay posts que mostrar |

**Estimación gruesa**, asumiendo trabajo en serie:

| Feature | Backend | Frontend | Total |
|---|---|---|---|
| C — Retirada del minijuego | 0,5 d | 0,5 d | **1 d** |
| D — Racha | 1 d | 1 d | **2 d** |
| A — Sesión de entrenamiento | 3 d | 5 d | **8 d** |
| B — Publicar progreso | 2,5 d | 2,5 d | **5 d** |
| | | | **≈ 16 días** |

De la fase 4, el `NumericKeypad` es el componente más caro (~1,5 días él solo): teclado
propio, botones contextuales por campo, navegación entre celdas y barra de ayuda.
Si hay que recortar alcance, **es lo primero que se puede posponer** usando `TextInput`
normal con `keyboardType="decimal-pad"` — se pierde el `+2.5/−1`, pero no bloquea nada.

---

## 8. Decisiones que necesito de ti

| # | Decisión | Opciones | Mi recomendación |
|---|---|---|---|
| D1 | ¿Dónde vive el feed de progreso? | (a) Sección dentro de Home, bajo las noticias · (b) Pestaña nueva en la barra inferior · (c) Solo en los perfiles, sin feed | **(a)** en v1. La barra inferior ya tiene 5 items y el botón `+` central; meter un sexto la rompe |
| D2 | ¿Se puede publicar sin foto? | (a) Sí, solo texto · (b) La foto es obligatoria | **(a)**. Obligar a la foto hace que casi nadie publique |
| D3 | Tipos de serie en v1 | (a) Los 4 de Symmetry · (b) Solo normal + calentamiento | **(b)** para v1. Descendente y al fallo añaden UI y reglas de XP para un caso de uso minoritario. El enum ya deja los 4 abiertos en BD |
| D4 | Edad mínima para publicar fotos | (a) Sin restricción · (b) 16+ · (c) 18+ | **(b)**. `profiles.age` admite desde 10 años y un feed con fotos de menores es un problema legal real (§4.5) |
| D5 | ¿La racha cuenta abrir la app o entrenar? | (a) Abrir la app · (b) Solo con actividad que da XP | **(a)** para v1, que es lo que pediste. (b) queda como evolución (§6.2) |
| D6 | ¿Congelar racha ("streak freeze")? | (a) No, se rompe y punto · (b) 1 día de gracia al mes | **(a)** en v1. (b) es fácil de añadir después sobre la misma RPC |

---

## 9. Validación antes de dar por cerrada cada feature

Los comandos que ya están en el proyecto:

```bash
pnpm run typecheck && pnpm run typecheck:api && pnpm run test:api && pnpm run build:api
```

```bash
npx supabase migration list
```

```bash
pnpm run doctor && pnpm run build:android:preview
```

Baseline actual a no romper: **14 suites / 64 tests**, typecheck móvil y API en verde,
`expo-doctor` 18/18.

Además, por cada migración nueva hay que pasar el advisor de Supabase
(`get_advisors`), que hoy está en **0 errores / 1 aviso**. Toda tabla nueva sin política
RLS dispara `0008_rls_enabled_no_policy` — por eso todas las de este plan llevan su
`using (false)` explícito.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Render plan gratuito: arranque en frío de ~42 s | La sesión de entrenamiento no puede quedarse colgada esperando a la API | La sesión funciona **offline sobre el borrador local**; la API solo se llama al terminar. Ya existe el precalentamiento de `/health` |
| APK `preview` ya distribuido con la API vieja | Un cambio incompatible en `log-session` rompe los APK instalados | Todos los campos nuevos del DTO son `@IsOptional()` |
| Migración base sin capturar con `db pull` | No se puede inicializar un Supabase vacío desde `supabase/migrations` | Todas las migraciones de este plan son aditivas e idempotentes. La deuda del `db pull` sigue pendiente y está anotada en el README |
| Fotos de progreso = datos personales sensibles | Exposición de fotos de personas | Bucket privado + URLs firmadas a 1 h + visibilidad por defecto `followers` + validación de prefijo de path |
| Las reps del minijuego las reporta el cliente | Inflado de ranking | No es una regresión (ya pasaba). El techo real es el tope de 5 recompensas/24 h, que no cambia |
| Licencia de la media de ejercicios (Gym visual) | Bloqueo legal si se publica en tienda | Ya documentado en el README. Copiar renders 3D de Symmetry empeoraría el problema, no lo resolvería |

---

## Anexo — Archivos que toca cada feature

**Feature A — Sesión de entrenamiento**

```
supabase/migrations/*_training_sessions.sql          (nuevo)
apps/api/src/domain/session.rules.ts                 (nuevo)
apps/api/src/domain/progression.rules.ts             (nuevo)
apps/api/src/domain/xp.rules.ts                      (modificado)
apps/api/src/workouts/workouts.service.ts            (modificado)
apps/api/src/workouts/workouts.controller.ts         (modificado)
apps/api/src/workouts/dto/log-workout-session.dto.ts (modificado)
apps/api/src/supabase/supabase.repository.ts         (modificado)
src/screens/ActiveSessionScreen.tsx                  (nuevo, sustituye LogWorkoutScreen)
src/screens/SessionSummaryScreen.tsx                 (nuevo)
src/screens/WorkoutHistoryScreen.tsx                 (nuevo)
src/screens/ExerciseProgressScreen.tsx               (nuevo)
src/components/SessionTimer.tsx                      (nuevo)
src/components/RestTimerBar.tsx                      (nuevo)
src/components/NumericKeypad.tsx                     (nuevo)
src/components/SetTypeSheet.tsx                      (nuevo)
src/components/ExerciseCarousel.tsx                  (nuevo)
src/navigation/AppNavigator.tsx                      (modificado)
src/types/index.ts                                   (modificado)
src/services/rankingUpApiClient.ts                   (modificado)
```

**Feature B — Publicar progreso**

```
supabase/migrations/*_progress_posts.sql             (nuevo)
apps/api/src/progress/                               (módulo nuevo)
apps/api/src/supabase/supabase.repository.ts         (modificado)
src/screens/SessionSummaryScreen.tsx                 (ampliado)
src/screens/ProgressFeedScreen.tsx                   (nuevo)
src/screens/ProfileScreen.tsx                        (modificado: grid)
src/screens/PublicProfileScreen.tsx                  (modificado: grid)
src/services/progressService.ts                      (nuevo: pipeline de imagen)
```

**Feature C — Retirada del minijuego**

```
apps/api/src/domain/minigame.rules.ts                (nuevo)
apps/api/src/domain/minigame.rules.spec.ts           (nuevo)
apps/api/src/profiles/dto/reward-minigame.dto.ts     (modificado)
apps/api/src/profiles/profiles.service.ts            (modificado)
src/constants/pushUpGame.ts                          (modificado)
src/screens/PushUpsGameScreen.tsx                    (modificado)
src/services/rankingUpApiClient.ts                   (modificado)
SIN MIGRACIÓN
```

**Feature D — Racha**

```
supabase/migrations/*_activity_streak.sql            (nuevo)
apps/api/src/streak/                                 (módulo nuevo)
apps/api/src/dashboard/dashboard.service.ts          (modificado)
apps/api/src/supabase/supabase.repository.ts         (modificado)
src/components/StreakBadge.tsx                       (nuevo)
src/screens/HomeScreen.tsx                           (modificado)
src/services/rankingUpApiClient.ts                   (modificado)
src/types/index.ts                                   (modificado)
```
