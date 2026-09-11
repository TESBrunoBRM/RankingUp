# RankingUp — Plan para dejar el proyecto "listo para buildear" como prototipo

**Fecha del análisis:** 2026-09-11
**Rama:** `main` (limpia, `ee45e75`)
**Objetivo:** un APK `preview` de EAS que cualquiera pueda instalar y usar sin tu Wi-Fi ni tu máquina encendida.

---

## Avance ejecutado el 2026-09-11

- ✅ Frontend con inicialización perezosa de Supabase y pantalla legible cuando falta configuración.
- ✅ Dependencias Expo alineadas; `expo-doctor` pasa **18/18**.
- ✅ API empaquetada en Docker y validada en modo producción: `/health` responde 200, `/docs` responde 404.
- ✅ Blueprint de Render (`render.yaml`) preparado con secretos externos al repositorio.
- ✅ Proyecto EAS creado y enlazado como `@brunobrm/rankingup`.
- 🟡 Entorno EAS `preview`: Supabase URL y anon key configuradas; falta la URL HTTPS pública de la API.
- ✅ CI añadida con typecheck, tests, build y Expo Doctor.
- ✅ Validación local: **14 suites / 64 tests**, typecheck móvil/API y build API en verde.
- ⏳ Pendiente externo: desplegar Render, rotar `service_role`, autenticar Supabase CLI para `db pull` y construir/probar el APK.

---

## 1. Veredicto en una línea

El **código está en buen estado** (typecheck limpio, 61 tests verdes, RLS bien cerrada, backend con guards y throttling). Lo que **no está listo es el empaquetado y el despliegue**: tal como está hoy, el APK de `preview` **crashea al abrir** porque no lleva variables de entorno, y aunque arrancara, apuntaría a una IP local (`10.198.168.232`) que no existe fuera de tu red.

No hay que reescribir nada. Hay que **cerrar la cadena build → despliegue → configuración**. Estimación: **1–2 días de trabajo real**.

---

## 2. Lo que ya funciona (verificado hoy, no asumido)

| Comprobación | Comando | Resultado |
|---|---|---|
| Typecheck móvil | `npx tsc --noEmit` | ✅ exit 0, sin errores |
| Tests del backend | `pnpm --filter @rankingup/api test` | ✅ 14 suites / **64 tests** en verde |
| Salud del proyecto Expo | `npx expo-doctor` | ✅ 18/18 |
| Proyecto Supabase | MCP `mpshqfizadislsqjispd` (*Fitproyect*) | ✅ `ACTIVE_HEALTHY` |
| Datos en BD | `count(*)` real | ✅ **1.324 ejercicios**, 6 rangos, 2 perfiles, 7 rutinas |
| RLS | `list_tables` | ✅ activa en las **12** tablas de `public` |
| Advisor de seguridad Supabase | MCP `get_advisors` | ✅ 0 errores, 1 aviso (§5.4) |
| Minijuego en GitHub Pages | `curl` a `MINIGAME_URL` | ✅ HTTP 200, 21.211 bytes |
| EAS CLI | `npx eas-cli --version` | ✅ 18.6.0 (cumple `>= 18.6.0`) |

El diseño de seguridad del backend es sólido y conviene no tocarlo: `service_role` vive solo en el servidor, las tablas sensibles (`duels`, `minigame_sessions`, `profile_follows`) están cerradas al cliente con `using (false)`, el ganador del duelo lo decide el servidor en [`duel.rules.ts`](apps/api/src/domain/duel.rules.ts), y los endpoints que reparten XP llevan `@Throttle` propio.

---

## 3. 🔴 Bloqueantes — sin esto no hay prototipo

### B1. El APK no lleva variables de entorno → crash al arrancar

**El más grave, y el menos obvio.**

`.env` está en `.gitignore`. EAS Build respeta `.gitignore` al subir el proyecto, y [`eas.json`](eas.json) **no define ningún bloque `env`**. Resultado: en el build de EAS, `process.env.EXPO_PUBLIC_SUPABASE_URL` es `undefined`.

Y eso no degrada: **revienta**. La cadena es:

```
App.tsx:5  →  import { supabase } from './src/lib/supabase'
src/lib/supabase.ts:7  →  requireSupabaseEnv()   // en el cuerpo del módulo, no en un hook
src/config/env.ts:57   →  throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL...')
```

El `throw` ocurre durante la evaluación del módulo, antes de que React monte nada. La app se cierra en la pantalla de splash sin mensaje útil.

**Arreglo:** declarar las variables en `eas.json` y guardar los valores como variables de entorno de EAS.

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://mpshqfizadislsqjispd.supabase.co" --environment preview --visibility plaintext
```

```bash
eas env:create --name EXPO_PUBLIC_RANKINGUP_API_URL --value "https://tu-api.onrender.com" --environment preview --visibility plaintext
```

La `ANON_KEY` igual, con `--visibility sensitive`. Y en `eas.json`:

```json
"preview": {
  "distribution": "internal",
  "environment": "preview",
  "android": { "buildType": "apk" }
}
```

> **Defensa en profundidad (recomendado):** mover el `requireSupabaseEnv()` de `src/lib/supabase.ts:7` a una inicialización perezosa, para que una variable ausente muestre una pantalla de error legible en vez de un cierre seco. Es lo que separa "no funciona" de "no funciona *porque* falta X".

---

### B2. La URL de la API es una IP de tu LAN, en HTTP plano

```
EXPO_PUBLIC_RANKINGUP_API_URL=http://10.198.168.232:3001
```

Dos fallos independientes, cada uno suficiente para romper el prototipo:

1. **Inalcanzable.** `10.198.168.232` es tu portátil en tu Wi-Fi. Para cualquier otra persona, no existe.
2. **Cleartext bloqueado.** Android 9+ prohíbe HTTP plano en builds de release. Expo inyecta `usesCleartextTraffic` solo en el manifiesto de *debug*. El APK `preview` es release: cada `fetch` fallará aunque la IP fuese alcanzable.

Esto tumba **todo** lo que pasa por [`rankingUpApiClient.ts:62`](src/services/rankingUpApiClient.ts:62): dashboard, ranking, nutrición, catálogo de ejercicios, duelos, generación de rutinas. Queda en pie solo el login (Supabase directo).

**Arreglo:** desplegar la API con HTTPS (B3) y apuntar `EXPO_PUBLIC_RANKINGUP_API_URL` a ese dominio. El fallback a host de desarrollo que ya existe en [`env.ts:31`](src/config/env.ts:31) sigue cubriendo el flujo local — no hay que tocarlo.

---

### B3. No existe ningún artefacto de despliegue para la API

No hay `Dockerfile`, ni `Procfile`, ni `render.yaml`, ni `fly.toml`, ni campo `engines`. `apps/api` además vive dentro de un workspace pnpm con `node-linker=hoisted`, así que un `npm install` ingenuo en el host no reproduce el árbol de dependencias.

**Arreglo (ruta más corta — Render, plan gratuito, HTTPS incluido):**

`Dockerfile` en la raíz del repo:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @rankingup/api...
COPY apps/api apps/api
RUN pnpm --filter @rankingup/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
```

Variables en el panel de Render (**nunca** en el repo): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`, `CORS_ORIGIN`, `TRUST_PROXY=1`, `ENABLE_SWAGGER=false`.

`TRUST_PROXY=1` no es opcional: sin él, Render mete su proxy delante y el `ThrottlerGuard` ve una sola IP para todos los usuarios — el rate limit global se convierte en un rate limit compartido.

Verificación: `curl https://tu-api/health` → `{"status":"ok","service":"rankingup-api"}`.

---

## 4. 🟠 Importantes — hay que cerrarlos antes de repartir el APK

### B4. `CORS_ORIGIN=*` y falta `NODE_ENV`

Tu `.env` tiene `CORS_ORIGIN=*` y no define `NODE_ENV`. [`main.ts:48`](apps/api/src/main.ts:48) **lanza y no arranca** si detecta `*` con `NODE_ENV=production` — protección correcta, pero significa que el primer despliegue fallará al arranque si copias el `.env` tal cual.

Además [`apps/api/.env.example`](apps/api/.env.example) está desactualizado: trae `CORS_ORIGIN=*` y no menciona `NODE_ENV`, `ENABLE_SWAGGER` ni `TRUST_PROXY`. El [`.env.example`](.env.example) de la raíz sí está bien. **Acción:** borrar el de `apps/api` o alinearlo con el de la raíz.

### B5. Rotación de claves

`.env` (correctamente ignorado por git) contiene ahora mismo:

- `SUPABASE_SERVICE_ROLE_KEY` — **el repo es público y esta clave se filtró en su día**. Rótala.
- `EXPO_PUBLIC_GEMINI_API_KEY` y `EXPO_PUBLIC_API_NINJAS_KEY` — **ya ningún fichero del código las lee** (verificado con grep sobre `src/` y `apps/api/src/`), así que hoy no se empaquetan en el APK. Pero siguen siendo claves vivas con prefijo `EXPO_PUBLIC_`: el día que alguien las referencie, entran en el binario. Bórralas de `.env` y revócalas en sus consolas.

### B6. Deriva entre las migraciones del repo y la base de datos real

El repo tiene 6 ficheros en `supabase/migrations/`. La BD tiene **8** migraciones aplicadas. Las dos que faltan en el repo:

- `20260831063038_drop_exercises_source_name_unique`
- `20260831064856_duels_winner_index`

Y, más importante: **no hay migración base**. Las tablas originales (`profiles`, `workouts`, `exercises`, `workout_logs`, `exercise_logs`, `food_logs`, `goals`, `ranks`) se crearon a mano en el SQL Editor — el propio README lo dice. Consecuencia: **un proyecto Supabase nuevo no se puede levantar desde el repo**, y si esa BD se cae no hay forma reproducible de rehacerla.

**Arreglo:**

```bash
npx supabase link --project-ref mpshqfizadislsqjispd
```

```bash
npx supabase db pull
```

Commitea el resultado. Deja de ser "documentación de pasos" y pasa a ser infraestructura reproducible.

---

## 5. 🟡 Higiene — baratos, hazlos de una pasada

### 5.1 Desajuste de versiones de Expo

```
expo            esperado ~54.0.37   instalado 54.0.36
expo-constants  esperado ~18.0.14   instalado 18.0.13
```

Solo patches. `npx expo install --check` y a otra cosa. Déjalo en verde antes de gastar un build de EAS.

### 5.2 Ficheros muertos en el repo

| Fichero | Problema |
|---|---|
| [`minigame.html`](minigame.html) (raíz) | Duplicado obsoleto de 9 KB. El que se usa de verdad es `apps/api/public/minigame.html` (21 KB), que es el que GitHub Pages sirve en `MINIGAME_URL`. Dos copias divergentes del mismo fichero es una trampa. |
| [`db-check.js`](db-check.js) | Script de depuración suelto en la raíz. Hace `require('dotenv')`, que no está en `package.json` — **crashea si lo ejecutas**. |
| `apps/api/.rankingup-api.*.log` | Logs de una ejecución vieja (ignorados por git, pero ahí siguen). |
| `tmp/informe_analysis/` | Directorio vacío. |

### 5.3 Sin CI

No existe `.github/`. `typecheck` y los 61 tests solo corren cuando te acuerdas. Un workflow de 20 líneas evita que el siguiente commit rompa el build sin que nadie se entere.

### 5.4 Protección de contraseñas filtradas desactivada (Supabase)

Único aviso del advisor de seguridad. Se activa con un clic en *Authentication → Policies*: comprueba contra HaveIBeenPwned en el registro. Gratis.
[Documentación](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

### 5.5 CSP y estáticos de la API sin uso

[`main.ts`](apps/api/src/main.ts) sirve `public/` y abre la CSP a `cdn.jsdelivr.net` para MediaPipe — pero el WebView carga el minijuego desde **GitHub Pages** ([`pushUpGame.ts:21`](src/constants/pushUpGame.ts:21)), no desde la API. Esa CSP relajada (`unsafe-eval`, `unsafe-inline`) no protege nada que se esté usando. Decide una de las dos: servir el minijuego desde la API (y entonces la CSP tiene sentido), o quitar `useStaticAssets` y endurecer la CSP.

### 5.6 Expectativas del prototipo

El escáner de comida por IA ([`aiAnalyzerService.ts`](src/services/aiAnalyzerService.ts)) **devuelve siempre "Manzana"**. Es un stub de demo consciente, y para un prototipo está bien — pero que esté escrito en las notas de entrega, no que lo descubra quien lo pruebe.

---

## 6. Plan de ejecución

### Fase 0 — Higiene (30 min, sin dependencias)

- [x] `npx expo install --check` → dejar `expo-doctor` en 18/18
- [ ] Borrar `minigame.html` (raíz), `db-check.js`, `apps/api/.rankingup-api.*.log`, `tmp/` (los dos ficheros rastreados ya fueron eliminados)
- [x] Alinear o borrar `apps/api/.env.example`
- [ ] Activar la protección de contraseñas filtradas en Supabase
- [ ] Commit: `chore: limpia ficheros muertos y alinea versiones de Expo`

### Fase 1 — Desplegar la API (2–4 h) · *bloquea la Fase 2*

- [x] Escribir el `Dockerfile` de §3
- [ ] **Rotar** `SUPABASE_SERVICE_ROLE_KEY` en Supabase (§B5)
- [ ] Crear el servicio en Render con las variables de entorno (service_role **solo** ahí)
- [ ] `NODE_ENV=production`, `CORS_ORIGIN` con orígenes reales, `TRUST_PROXY=1`, `ENABLE_SWAGGER=false`
- [ ] Verificar: `curl https://tu-api/health` → `{"status":"ok"}`
- [ ] Verificar que `/docs` devuelve 404 (Swagger cerrado en producción)

### Fase 2 — Cablear el build del APK (1–2 h)

- [ ] `eas env:create` para las tres `EXPO_PUBLIC_*` en el entorno `preview` (2/3 listas; falta la URL pública de la API)
- [x] Añadir `"environment": "preview"` al perfil `preview` de `eas.json`
- [ ] Apuntar `EXPO_PUBLIC_RANKINGUP_API_URL` al dominio HTTPS de la Fase 1
- [x] (Recomendado) Hacer perezoso el `requireSupabaseEnv()` para fallar con un mensaje legible
- [x] `pnpm typecheck && pnpm test:api && pnpm doctor` — los tres en verde
- [ ] `pnpm run build:android:preview`

### Fase 3 — Validar en dispositivo (1 h)

- [ ] Instalar el APK en un móvil **con datos móviles, no en tu Wi-Fi** — es la prueba que ataca B2 de frente
- [ ] Registro → onboarding → login
- [ ] Catálogo de ejercicios (debe traer los 1.324, con filtros y GIF)
- [ ] Crear rutina → registrar sesión → ver que el XP sube
- [ ] Ranking y dashboard con datos reales
- [ ] Minijuego de flexiones (permiso de cámara + detección MediaPipe)
- [ ] Duelo 1v1 entre dos móviles (marcador en vivo + ganador decidido por el servidor)
- [ ] Nutrición: buscar alimento y registrarlo

### Fase 4 — Reproducibilidad (2–3 h, se puede hacer después de repartir)

- [ ] `supabase db pull` → commitear la migración base (§B6)
- [x] Workflow de CI: `typecheck` + `test:api` en cada push
- [ ] Resolver §5.5 (CSP / estáticos)
- [x] Actualizar el README: documenta el estado de migraciones y el flujo Docker → Render → EAS

---

## 7. Criterio de aceptación: ¿cuándo está "listo"?

El prototipo está listo cuando **las ocho** se cumplen:

1. `npx tsc --noEmit` → exit 0
2. `pnpm --filter @rankingup/api test` → 64/64
3. `npx expo-doctor` → 18/18
4. `curl https://tu-api/health` responde `{"status":"ok"}` desde cualquier red
5. `curl https://tu-api/docs` → 404
6. El APK abre sin crash en un móvil **fuera de tu Wi-Fi**
7. Catálogo, ranking, duelo y nutrición traen datos reales en ese móvil
8. `SUPABASE_SERVICE_ROLE_KEY` rotada y presente solo en el gestor de secretos del host

Los puntos 1–3 ya se cumplen hoy. Los que faltan son **4–8**, y todos cuelgan de las Fases 1 y 2.

---

## 8. Anexo — Escaneo de seguridad con Strix

### Estado de la instalación

```bash
npx skills add usestrix/strix https://github.com/usestrix/strix
```

✅ Completado. Instala **9 skills** en `.agents/skills/` (ignorado por git, registrado en `skills-lock.json`):

`penetration-testing-with-strix` · `find-security-vulnerabilities-in-code` · `api-security-testing` · `web-app-penetration-testing` · `owasp-top-10-testing` · `application-security-testing` · `ci-security-scanning-with-strix` · `fix-security-vulnerabilities-with-strix` · `managed-pentesting-with-strix`

Entorno preparado en esta sesión:

| Requisito | Estado |
|---|---|
| Docker | ✅ 29.6.1, daemon arrancado |
| CLI de Strix | ✅ `strix 1.6.2` (vía `uv tool install strix-agent`) |
| Clave de LLM | ⏳ pendiente — `STRIX_LLM` + `LLM_API_KEY` |

### Comandos del escaneo

**White-box sobre el backend** (el objetivo con más superficie: guards, lógica de XP, resolución de duelos):

```bash
strix -n -t ./apps/api --scan-mode standard --max-budget 15 --instruction "API NestJS con auth de Supabase. El JWT trae el user id; el backend usa service_role y se salta RLS, asi que toda comprobacion de propiedad es responsabilidad del codigo. Centrate en IDOR entre perfiles y duelos, en escalada de XP (endpoints minigame-xp y duels/report) y en si algun endpoint devuelve datos de otro usuario."
```

**Black-box contra la API desplegada** (ejecutar después de la Fase 1, mucho más concluyente):

```bash
strix -n -t https://tu-api -t ./apps/api --max-budget 20
```

Resultados en `strix_runs/<run>/`: empieza por `penetration_test_report.md`; cada hallazgo lleva prueba de concepto en `vulnerabilities/*.md`.

> ⚠️ Strix monta el directorio en el sandbox **con permiso de escritura**: lanza el escaneo con el árbol de git limpio.

### Qué esperar

La revisión manual de hoy no encontró fallos explotables en el modelo de autorización: todos los controladores llevan `SupabaseAuthGuard`, el id de usuario sale del token (`@CurrentUser`) y nunca del body, los `:duelId` pasan por `ParseUUIDPipe`, y las tablas sensibles están cerradas al cliente con `using (false)`. Lo que Strix sí puede probar y yo no: **lógica de negocio bajo concurrencia** — dos reportes simultáneos del mismo duelo, carreras en el tope diario de XP, el `@Throttle` de `minigame-xp` bajo paralelismo real.

---

## 9. Lo que deliberadamente *no* toca este plan

Un prototipo no necesita esto, y meterlo ahora retrasa la entrega:

- Tests E2E o de integración del móvil (los 61 unitarios del backend cubren el dominio crítico)
- Optimizar los 19 índices "sin usar" del advisor — son normales con 2 usuarios; se juzgan con tráfico real
- Licencia de la media de Gym visual — obligatoria **antes de publicar en tiendas**, no para un APK interno (el README ya lo documenta)
- Build de iOS — el objetivo declarado es un APK Android
- Sustituir el stub del escáner de comida por IA (§5.6)
