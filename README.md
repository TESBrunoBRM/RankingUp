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
- 🤖 **Planificador de Entrenamiento con IA:** Asistente inteligente (Gemini) que genera rutinas a medida basándose en el equipo disponible, grupo muscular, experiencia y tiempo.
- 🥘 **Seguimiento de Nutrición Inteligente:**
  - Calcula automáticamente tus objetivos calóricos diarios y distribución de macronutrientes.
  - Base de datos exhaustiva gracias a la integración con **FatSecret**.
  - 📸 **Escáner de Alimentos con IA:** Identifica comida y extrae sus calorías con solo tomar una fotografía.
- 🔒 **Seguridad y Sincronización:** Autenticación fluida y sincronización en tiempo real potenciada por **Supabase** y políticas RLS.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React Native, Expo, TypeScript.
- **Gestión de Estados:** Zustand.
- **Navegación:** React Navigation (Native Stack, Bottom Tabs).
- **Backend y Autenticación:** Supabase (Auth, PostgreSQL, Realtime, Storage).
- **APIs:** FatSecret REST API (Nutrición), Google Gemini Flash (IA Fotográfica y Creador de Rutinas).

---

## 📁 Estructura del Proyecto

```text
📦 RankingUp
 ┣ 📂 assets/              # Imágenes, iconos y medallas de rangos
 ┣ 📂 src/
 ┃ ┣ 📂 components/        # Componentes UI reutilizables (Botones, Tarjetas, Inputs)
 ┃ ┣ 📂 lib/               # Configuración de clientes (Supabase, variables de entorno)
 ┃ ┣ 📂 navigation/        # Enrutadores y coordinadores de navegación
 ┃ ┣ 📂 screens/           # Pantallas de la aplicación (Registro, Nutrición, Home)
 ┃ ┣ 📂 services/          # Conexión a APIs externas (FatSecret, IA, Supabase DB)
 ┃ ┣ 📂 store/             # Gestión de estado global de usuario y UI (Zustand)
 ┃ ┗ 📂 types/             # Definiciones de TypeScript e interfaces
 ┣ 📜 App.tsx              # Punto de entrada principal
 ┗ 📜 app.json             # Configuración maestra para Expo y publicación
```

---

## 🚀 Manual de Instalación Local

Sigue estos pasos para desplegar el entorno de desarrollo en tu propia máquina.

### 📋 Requisitos Previos

1. [Node.js](https://nodejs.org/es/) (Versión LTS más reciente recomendada).
2. [Expo Go](https://expo.dev/client) instalado en tu dispositivo móvil iOS o Android.
3. Cuenta en [Supabase](https://supabase.com/) con un proyecto activo.
4. Credenciales de la API de **FatSecret** y **Google Generative AI** (opcional pero recomendado para probar todas las funciones).

### 🛠️ Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TESBrunoBRM/RankingUp.git
   cd RankingUp
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las Variables de Entorno (`.env`):**
   Crea un archivo `.env` en la raíz del proyecto basándote en el archivo `.env.example`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=tu_url_de_proyecto_supabase
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_publica
   EXPO_PUBLIC_FATSECRET_CLIENT_ID=credencial_fatsecret
   EXPO_PUBLIC_FATSECRET_CLIENT_SECRET=credencial_fatsecret
   ```

4. **Configuración de la Base de Datos (Supabase):**
   Ejecuta las migraciones necesarias en el **SQL Editor** de Supabase para inicializar las tablas principales: `profiles`, `workouts`, `exercises`, `workout_exercises`, `workout_logs`, `nutrition_logs`.

5. **Iniciar el servidor de desarrollo:**
   ```bash
   npx expo start
   ```

6. **Desplegar en formato nativo:**
   Abre la app de **Expo Go** en tu celular y escanea el código QR que aparece en la terminal. ¡Eso es todo!

---

## 🛡️ Licencia

Este proyecto opera libremente sujeto bajo término del tipo **MIT**. ¡Siéntete libre de colaborar y modificar!

