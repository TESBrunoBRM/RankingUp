<div align="center">
  <img src="https://img.icons8.com/color/120/000000/trophy.png" alt="RankingUp Logo"/>
  <h1>🏆 RankingUp</h1>
  <p><b>Aplicación integral y gamificada de entrenamiento y nutrición</b></p>

  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge)](https://github.com/pmndrs/zustand)
</div>

<br/>

**RankingUp** evalúa tu progreso físico y te mantiene motivado calculando tu fuerza relativa, tu IMC (Índice de Masa Corporal) y asignándote un rango en una tabla de clasificación global. Además, ofrece herramientas sólidas para el seguimiento de rutinas, registros de nutrición y herramientas de inteligencia artificial.

---

## ✨ Características Principales

- 🎮 **Entrenamiento Gamificado:** Gana experiencia (XP) por completar entrenamientos. Visualiza tu fuerza relativa y obtén un rango (*Hierro, Bronce, Plata, Oro*, etc.) en la tabla de clasificación global.
- 🏋️ **Gestión de Rutinas (CRUD):** Crea entrenamientos personalizados, añade ejercicios de una base de datos central y registra tus series, repeticiones y peso.
- 🤖 **Planificador de Entrenamiento Demo:** Genera rutinas a medida basándose en equipo, grupo muscular, duración y frecuencia sin exponer claves externas en el APK.
- 🥘 **Seguimiento de Nutrición Inteligente:**
  - Calcula automáticamente tus objetivos calóricos diarios y distribución de macronutrientes.
  - Catálogo de alimentos servido desde backend y soporte opcional de proxy externo.
  - 📸 **Escáner de Alimentos:** Flujo de cámara preparado para demo con fallback seguro hacia búsqueda backend.
- 📚 **Catálogo de 1.324 ejercicios:** Buscador con filtros por zona, equipamiento y músculo, GIF animado y pasos en español para cada ejercicio.
- ⚔️ **Duelo 1v1 de flexiones:** Reta a otro atleta y competid a la vez con marcador en vivo (Supabase Realtime). El ganador lo decide el backend.
- 🔒 **Seguridad y Sincronización:** Autenticación fluida y sincronización en tiempo real potenciada por **Supabase** y políticas RLS.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React Native, Expo, TypeScript.
- **Gestión de Estados:** Zustand.
- **Navegación:** React Navigation (Native Stack, Bottom Tabs).
- **Backend API:** NestJS en `apps/api` para lógica crítica de XP, ranking, nutrición y generación de rutinas.
- **Endpoints principales:** `/health`, `/v1/profile/onboarding`, `/v1/profile/metrics`, `/v1/workouts/log-session`, `/v1/workouts/generate-plan`, `/v1/nutrition/logs`, `/v1/ranking` y `/v1/dashboard`.
- **Autenticación y datos:** Supabase Auth + PostgreSQL. El backend usa service role solo del lado servidor.
- **APIs externas:** Opcionales mediante proxy/backend propio. El APK no incluye secretos de FatSecret, Gemini ni API Ninjas.

---

## 📁 Estructura del Proyecto

```text
📦 RankingUp
 ┣ 📂 assets/              # Imágenes, iconos y medallas de rangos
 ┣ 📂 apps/api/            # API NestJS con lógica crítica y unit tests
 ┣ 📂 src/
 ┃ ┣ 📂 components/        # Componentes UI reutilizables (Botones, Tarjetas, Inputs)
 ┃ ┣ 📂 lib/               # Configuración de clientes (Supabase, variables de entorno)
 ┃ ┣ 📂 navigation/        # Enrutadores y coordinadores de navegación
 ┃ ┣ 📂 screens/           # Pantallas de la aplicación (Registro, Nutrición, Home)
 ┃ ┣ 📂 services/          # Clientes API/Auth y CRUD simple de Supabase
 ┃ ┣ 📂 store/             # Gestión de estado global de usuario y UI (Zustand)
 ┃ ┗ 📂 types/             # Definiciones de TypeScript e interfaces
 ┣ 📜 App.tsx              # Punto de entrada principal
 ┗ 📜 app.json             # Configuración maestra para Expo y publicación
```

---

## 🚀 Manual de Instalación Local

Sigue estos pasos para desplegar el entorno de desarrollo en tu propia máquina.

### 📋 Requisitos Previos

1. [Node.js](https://nodejs.org/es/) 22 y pnpm 11.7 mediante Corepack.
2. [Expo Go](https://expo.dev/client) instalado en tu dispositivo móvil iOS o Android.
3. Cuenta en [Supabase](https://supabase.com/) con un proyecto activo.
4. Variables de Supabase configuradas en `.env` o EAS Secrets.

### 🛠️ Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TESBrunoBRM/RankingUp.git
   cd RankingUp
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Configurar las Variables de Entorno (`.env`):**
   Crea un archivo `.env` en la raíz del proyecto basándote en el archivo `.env.example`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=tu_url_de_proyecto_supabase
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_publica
   EXPO_PUBLIC_ENABLE_DEMO_FALLBACKS=true
   EXPO_PUBLIC_RANKINGUP_API_URL=https://tu-api-rankingup.example.com

   SUPABASE_URL=tu_url_de_proyecto_supabase
   SUPABASE_ANON_KEY=tu_clave_anonima_publica
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_solo_backend
   PORT=3001
   CORS_ORIGIN=http://localhost:8081
   NODE_ENV=development
   ```

   > ⚠️ `SUPABASE_SERVICE_ROLE_KEY` ignora RLS por completo. Va **solo** en el
   > entorno del servidor, nunca en `.env.example` ni en variables `EXPO_PUBLIC_*`
   > (esas se empaquetan en el APK). En producción `CORS_ORIGIN` no puede ser `*`:
   > la API se niega a arrancar.

4. **Configuración de la Base de Datos (Supabase):**
   El proyecto de desarrollo actual usa las migraciones de `supabase/migrations`.
   Vincula la CLI antes de inspeccionar o aplicar cambios:
   ```bash
   npx supabase login
   npx supabase link --project-ref mpshqfizadislsqjispd
   npx supabase migration list
   ```

   > La migración base de las tablas originales todavía debe capturarse con
   > `npx supabase db pull`. Hasta completar ese paso, no uses estas migraciones
   > incrementales para inicializar un proyecto Supabase vacío ni ejecutes SQL a
   > mano en producción.

5. **Instalar y validar el backend NestJS:**
   (Nota: `pnpm install` en la raíz ya instala las dependencias de la API automáticamente debido a los workspaces)
   ```bash
   pnpm run test:api
   pnpm run typecheck:api
   pnpm run build:api
   ```

6. **Iniciar la API local:**
   ```bash
   pnpm --filter @rankingup/api run start:dev
   ```

7. **Iniciar el servidor de desarrollo Expo:**
   ```bash
   pnpm start
   ```

8. **Validar y generar APK preview:**
   ```bash
   pnpm run typecheck
   pnpm run doctor
   pnpm run build:android:preview
   ```

   El perfil `preview` de EAS genera un APK interno para entregar como prototipo Android.

### Despliegue del prototipo

La API de prototipo activa está disponible en
`https://rankingup-api.onrender.com`. El APK `preview` debe usar esa URL y no
una dirección LAN.

1. **Validar la imagen de producción de la API:**
   ```bash
   docker build -t rankingup-api:prototype .
   docker run --rm --env-file .env -e NODE_ENV=production \
     -e CORS_ORIGIN=https://rankingup.app -e TRUST_PROXY=1 \
     -e ENABLE_SWAGGER=false -p 3001:3001 rankingup-api:prototype
   ```

2. **Crear la API en Render:** el servicio actual usa el runtime Node sobre la
   rama `codex/prototype-deploy`. El Blueprint `render.yaml` conserva la
   alternativa Docker reproducible. Configura `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `CORS_ORIGIN` en Render.
   La clave `service_role` nunca debe entrar al APK ni al repo.

3. **Configurar el entorno EAS `preview`:**
   ```bash
   eas env:set preview --name EXPO_PUBLIC_SUPABASE_URL --value "..." --visibility plaintext
   eas env:set preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..." --visibility sensitive
   eas env:set preview --name EXPO_PUBLIC_RANKINGUP_API_URL --value "https://rankingup-api.onrender.com" --visibility plaintext
   ```

4. **Comprobar el servicio público y construir:**
   ```bash
   curl https://rankingup-api.onrender.com/health
   curl -I https://rankingup-api.onrender.com/docs
   pnpm run build:android:preview
   ```

   El primer endpoint debe responder 200 y `/docs` debe responder 404 en
   producción. No construyas el APK mientras la URL de EAS apunte a `localhost`
   o a una IP privada.

---

## 📚 Catálogo de ejercicios

El catálogo procede de [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset):
1.324 ejercicios con zona, equipamiento, músculo objetivo e instrucciones paso a paso en español.

Para cargarlo en Supabase (idempotente, se puede repetir):

```bash
pnpm --filter @rankingup/api seed:exercises
```

Endpoints: `GET /v1/exercises` (búsqueda con filtros y paginación),
`GET /v1/exercises/filters` (facetas con conteo), `GET /v1/exercises/:id`
y `GET /v1/exercises/by-name?name=` (usado por las pantallas de rutina).

### ⚠️ Licencia de la media

Los **datos** del dataset son MIT. Las **imágenes y GIF son © Gym visual** y el
repositorio de origen los redistribuye con un permiso escrito propio:
*clonar ese repositorio no te concede una licencia*. Este proyecto **no** copia
los binarios: solo guarda la ruta relativa y la atribución, y compone la URL con
`EXERCISE_MEDIA_BASE_URL` (por defecto apunta al repositorio original).

Antes de publicar la app revisa los
[términos de Gym visual](https://gymvisual.com/content/3-terms-and-conditions-of-use)
y, si hace falta, obtén tu licencia y apunta `EXERCISE_MEDIA_BASE_URL` a tu propia
copia. La atribución se muestra en la ficha de cada ejercicio y debe mantenerse.

---

## ⚔️ Duelo 1v1 de flexiones

- El reto y la aceptación van por la API (`/v1/duels`).
- Durante la partida, los contadores viajan por un **canal privado de Supabase
  Realtime**: `realtime.messages` tiene políticas RLS que solo admiten a los dos
  participantes mientras el duelo sigue abierto.
- El **ganador y el XP los decide el backend** con las repeticiones que cada
  jugador reporta al terminar y la marca de tiempo del servidor. Los contadores
  en vivo son solo visuales: manipularlos no cambia el resultado.
- Tope de 5 duelos con recompensa cada 24 h, igual que el minijuego individual.

---

## 🛡️ Licencia

Este proyecto opera libremente sujeto bajo término del tipo **MIT**. ¡Siéntete libre de colaborar y modificar!
