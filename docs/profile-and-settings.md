# Perfil y ajustes · 1.2.0

El perfil presenta identidad, estadísticas y publicaciones/marcas. Editar perfil abre un formulario exclusivo de nombre, usuario y bio. El menú de tres rayas abre Ajustes, con cuenta, datos físicos, funciones y guía, tema, privacidad, ayuda, términos y cierre de sesión.

Cada sección respeta las funciones habilitadas. No se muestran seguidores/publicaciones con Comunidad desactivada ni marcas/historial con Ejercicios desactivado. Nutrición tiene sus objetivos dentro de Datos físicos y objetivos. El inicio deja de repetir las tarjetas de funciones, nutrición y seguridad. La información de seguridad permanece en el recorrido inicial, en el contexto de uso y desplegable dentro de Ajustes.

El control de privacidad permanece accesible incluso con Comunidad desactivada, para poder ocultar un perfil publicado anteriormente.

## Guardado

- Identidad: `PATCH /v1/profile/social`. Omitir `isPublic` conserva la visibilidad existente; clientes anteriores aún pueden enviarla.
- Privacidad: `PATCH /v1/profile/privacy`, cuerpo `{ "isPublic": false }`. La identidad autenticada determina el perfil; el cuerpo no admite un ID de otro usuario. Solo modifica `is_public`.
- Métricas: se guardan por separado con `PATCH /v1/profile/metrics`. La referencia nutricional se calcula al guardar, evitando peticiones competidoras al cambiar cada selector. Los datos físicos no se exponen en el perfil público.
- El tema se conserva localmente con el mecanismo existente. Un error de privacidad conserva la última visibilidad confirmada y muestra el fallo.

La versión incluye la corrección del generador de rutinas completas documentada en [workout-planning.md](workout-planning.md).

## Validación

- Regresiones de identidad/privacidad en el servicio de perfiles.
- Prueba de interfaz de perfil → ajustes → privacidad → edición, tema claro/oscuro y métricas.
- Revisión de perfiles con solo ejercicios, solo nutrición y solo comunidad.
- `pnpm run verify`: pruebas, TypeScript del cliente/API y Expo Doctor.

El ensayo de interfaz usa React Native Web con datos de prueba; el APK permite comprobar el comportamiento nativo en el dispositivo.
