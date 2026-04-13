# 🏆 RankingUp

**RankingUp** es una aplicación integral y gamificada de entrenamiento (fitness) y nutrición desarrollada en React Native. Ayuda a los usuarios a mantenerse motivados calculando su fuerza relativa, su IMC (Índice de Masa Corporal) y asignándoles un rango en una tabla de clasificación global según su progreso físico. Además, ofrece herramientas sólidas para el seguimiento de rutinas y nutrición.

## ✨ Características Principales

*   **Entrenamiento Gamificado:** Gana experiencia (XP) por completar entrenamientos. Visualiza tu fuerza relativa y obtén un rango (ej. Hierro, Bronce) en una tabla de clasificación global.
*   **Gestión de Rutinas (CRUD):** Crea entrenamientos personalizados, añade ejercicios específicos y registra tus series, repeticiones y peso.
*   **Seguimiento de Nutrición y Calorías:**
    *   Flujo de incorporación (*onboarding*) para registrar métricas iniciales del usuario (peso, altura, objetivos).
    *   Cálculo automático y personalizado de objetivos calóricos diarios.
    *   Sistema avanzado de registro de alimentos.
*   **Escáner de Alimentos con Inteligencia Artificial:** Identifica alimentos y registra automáticamente sus datos nutricionales con solo tomar una fotografía (potenciado por IA y la cámara de Expo).
*   **Autenticación Segura:** Registro de usuarios e inicio de sesión seguros gestionados de punta a punta con Supabase Auth.
*   **Base de Datos en Tiempo Real:** Los datos se sincronizan utilizando la base de datos de Supabase, lo que permite consultas unificadas y seguras usando RLS (Row Level Security).

## 🛠️ Tecnologías Utilizadas (Stack)

*   **Frontend:** React Native, Expo, TypeScript
*   **Gestión de Estados:** Zustand
*   **Navegación:** React Navigation (Native Stack, Bottom Tabs)
*   **Backend y Autenticación:** Supabase (PostgreSQL, Realtime, Storage)
*   **APIs:** Integración con la API de FatSecret (para datos nutricionales) y APIs de IA para análisis de imágenes de alimentos.
*   **Almacenamiento Local:** AsyncStorage (para persistencia de sesión local)

## 📁 Estructura del Proyecto

```text
proyecto/
├── assets/                 # Imágenes, iconos y fuentes (ej. medallas de rangos)
├── src/
│   ├── components/         # Componentes de interfaz reutilizables (Botones, Inputs, etc.)
│   ├── lib/                # Configuraciones de librerías (Cliente de Supabase)
│   ├── navigation/         # Pilas de navegación y coordinadores de pestañas principales
│   ├── screens/            # Pantallas completas (Inicio, Login, Nutrición, etc.)
│   ├── services/           # Llamadas a APIs externas, operaciones de BDD y servicios de IA
│   ├── store/              # Manejo del estado global de la aplicación funcional con Zustand
│   └── types/              # Tipados de TypeScript de tablas e interfaces de respuestas
├── App.tsx                 # Punto de entrada principal de la aplicación
└── app.json                # Configuración maestra para Expo
```

## 🚀 Manual de Instalación Local

A continuación se detallan los pasos para poder ejecutar este proyecto en tu entorno de desarrollo.

### 📋 Requisitos Previos

*   [Node.js](https://nodejs.org/es/) (Se recomienda usar la versión LTS más reciente aprobada para Expo)
*   Tener instalado y configurado `npm` o instalador compatible como `yarn`.
*   [Expo CLI](https://expo.dev/) y contar con la aplicación **Expo Go** instalada y al día en el teléfono móvil físico (iOS o Android) para probar los usos de cámara.
*   Tener acceso a un proyecto funcional e iniciar sesión en plataforma en [Supabase](https://supabase.com/).

### 🛠️ Pasos de Instalación

1.  **Clonar el repositorio**
    Abre tu terminal favorita (línea de comandos) y ejecuta el siguiente comando para descargar todo el código del proyecto en tu máquina física:
    ```bash
    git clone https://github.com/TESBrunoBRM/RankingUp.git
    cd RankingUp
    ```

2.  **Instalar dependencias clave de librería**
    Instala todos los paquetes requeridos indicados en nuestro proyecto ejecutando:
    ```bash
    npm install
    # o si has decidido utilizar el empaque yarn
    yarn install
    ```

3.  **Configuración de Variables de Entorno e Integración Segura (.env)**
    Es obligatorio utilizar variables de entorno para que el proyecto pueda interactuar con backend y APIs sin exponer credenciales en repositorios compartidos. Dispositivo base de template en el proyecto en `.env.example`. Te pediremos crear este archivo de la siguiente manera:
    
    *   Crea un nuevo archivo en tu raíz llamado sencillamente: `.env`.
    
    *   Ingresa las llaves dentro del archivo copiando las líneas contenidas en `example` sumando las tuyas, ejemplo de contenido base:
        ```env
        EXPO_PUBLIC_SUPABASE_URL=tu_url_de_proyecto_supabase_ingresada_aca
        EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_publica_de_supabase
        ```
    > Los datos `URL` y `Anon Key` se podrán obtener visitando el apartado "Settings", entrando a "API" dentro del tablero o menú izquierdo del ecosistema web interactivo en Supabase de tu propio proyecto.

4.  **Configuración de la Base de Datos (Supabase)**
    Antes que la red intente leer o escribir la información debes asegurarte que tus bases de datos ya se encuentren instanciadas a nivel esquema dentro del "SQL Editor" de tu cuenta Supabase usando las migras de proyecto e inicializando estas tablas base como mínimo:
    *   `profiles` (Datos e información general individual por perfil)
    *   `workouts` (Metadatos propios del diseño rutinario o plan principal)
    *   `exercises` (Estructura referencial matriz para los movimientos con descripciones y tipos musculares)
    *   `workout_exercises` (Vinculaciones entre la rutina a los ejercicios elegidos, volumen del bloque, número de repeticiones de la meta y sets totales)
    *   `workout_logs` (El histórico y transacciones del entrenamiento procesado al completar el día de actividad)
    *   `nutrition_logs` (Seguimiento transaccional general sobre comida cargada en sistema o foto)

5.  **Iniciar la compilación en tiempo real Metro d'Expo**
    Haz arrancar el proceso nativo de desarrollo:
    ```bash
    npx expo start
    ```

6.  **Desplegar el sistema al equipo final del desarrollador e interactuar**
    *   Se visualizará un Código QR generado al terminal o en la ventana del navegador. 
    *   Agarra tu dispositivo personal con **Expo Go** previamente configurado y escanea el cuadro respectivo de acuerdo al OS. En segundos la aplicación procesará las dependencias visuales de paquete de datos JS y tu aplicación de App cargará en pantalla en el teléfono directamente para ser operada con interacciones fluidas táctiles!
    *   *Opcional*: Se admite correr a través de emulador interactuando las teclas mostradas abajo de QR dentro del Shell/Consola presionando la "a" minúscula (Android Studio de Google SDK de emulado corriendo) ó "i" minúscula para sistema de Apple Simulator Xcode bajo máquina macOS.

## 🛡️ Licencia

Este proyecto opera libremente sujeto bajo término del tipo MIT.
