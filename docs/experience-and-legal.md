# Inicio guiado y condiciones de uso · 23 de octubre de 2026

La primera sesión, incluso con Google/Facebook o una cuenta existente, comprueba
la aceptación de los términos `2026-10-23` y después la configuración de experiencia.
No hay funciones preseleccionadas. Una cuenta sin configuración, con una guía
desactualizada o con errores al cargarla debe completar o reintentar el flujo.

## Comportamiento

- **Ejercicios:** rutinas, planificación manual/automática, sesiones e historial.
- **Alimentación:** comidas, escáner, aportes de alimentos y agua. La meta personal
  es opcional; sin ella, se muestran consumos sin metas calóricas predeterminadas.
- **Comunidad:** publicaciones, búsqueda y perfiles. Combinada con Ejercicios,
  habilita también la pestaña de rangos y los minijuegos/duelos.
- Inicio, perfil, términos y soporte permanecen disponibles. Perfil → Mis funciones
  y guía permite cambiar la selección y repetir el recorrido.
- Desactivar una función conserva sus registros. La selección simplifica la
  navegación; no es un mecanismo de autorización, una evaluación clínica ni un
  cambio automático de la visibilidad del perfil o de publicaciones anteriores.
- No se requieren datos físicos para acceder a ejercicios. Los cálculos calóricos
  automáticos se limitan a adultos de 18 a 100 años y siguen siendo estimaciones.
- Registro mantiene el mínimo existente de 8 caracteres, lo muestra siempre y
  actualiza cumplimiento y coincidencia al escribir. Debe mantenerse alineado con
  la política de contraseñas del proyecto Supabase al cambiar esa política.

## Registro de confirmaciones

`PUT /v1/experience` exige al menos una función válida y distinta, la versión
vigente y tres confirmaciones explícitas: lectura de avisos, exactitud de datos y
finalización de la guía. La identidad procede del token; no admite un ID de usuario
en el cuerpo. Las fechas las establece el servidor. No se solicitan diagnósticos.

`user_experiences` guarda la selección actual. `experience_acceptances` conserva
recibos anteriores con funciones, versión y fecha. Los endpoints no permiten
editar recibos. Si falla el guardado de preferencias después de insertar un recibo,
el cliente informa del error y permite reintentar; ese recibo adicional no habilita
la entrada. Al eliminar la cuenta se eliminan ambos registros por cascada.

La migración activa RLS y revoca acceso directo de `anon` y `authenticated`; las
operaciones se realizan en la API autenticada. `POST /v1/legal/acceptance` ahora
requiere `documentVersion`, para no registrar como aceptado un texto diferente
del mostrado. La aceptación legal conserva versiones previas en su tabla existente.

## Publicación

1. Revisar y aplicar `supabase/migrations/20261023052248_user_experience.sql` en el
   entorno correspondiente, siguiendo el procedimiento de migraciones del README.
2. Publicar la API y después distribuir la nueva app. Las versiones anteriores de
   la app pedirán actualizarse al detectar la nueva versión de términos.
3. Verificar el nombre legal y correo configurados en `EXPO_PUBLIC_LEGAL_ENTITY_NAME`
   y `EXPO_PUBLIC_LEGAL_CONTACT_EMAIL`.
4. Revisar en un dispositivo real: una cuenta nueva con solo ejercicios, solo
   nutrición, todas las funciones, una cuenta antigua, cambio de selección,
   reingreso, conexión fallida y cambio de cuenta. No se debe entrar al inicio
   cuando falle la confirmación o el guardado.

Estos cambios preparan el código y la migración local; no aplican migraciones ni
publican servicios remotos por sí solos.

La migración `20261023052248_user_experience.sql` se aplicó al proyecto Supabase
`mpshqfizadislsqjispd` el 23 de octubre de 2026. Se verificaron RLS y la ausencia de
acceso directo para `anon` y `authenticated`. La build Android 1.1.0 (versionCode 2)
es [3fffe1e5](https://expo.dev/accounts/brunobrm/projects/rankingup/builds/3fffe1e5-8fd2-437a-8b32-8f0e4465c692).
La API se publicó en Render (`dep-dbdeurtg1s2s73b96u80`) desde el commit
`3fe9239`. Se verificaron `/health` (200), `/v1/experience` (401 sin token) y
`/v1/legal/acceptance` (401 sin token), sin errores recientes en los logs del servidor.

## Revisión de los términos

El texto incorpora riesgos de lesiones/enfermedades, límites de estimaciones,
señales para detener el ejercicio, deber de aportar y actualizar datos correctos,
orientación profesional y derechos del consumidor. La responsabilidad del usuario
se refiere a las consecuencias atribuibles a sus datos o conducta, conforme a la
ley; no es una exención absoluta de responsabilidad de RankingUp.

Antes de publicar debe revisarse jurídicamente con la identidad del operador,
mercados donde se ofrece la app, tratamiento real de datos y proveedores. Ningún
texto puede garantizar la ausencia de denuncias. La referencia chilena se usó por
el contexto del proyecto, sin imponer una jurisdicción contractual no confirmada.

Fuentes de la revisión:

- [Ley chilena 19.496, en especial artículos 4 y 16](https://www.bcn.cl/leychile/Navegar?idNorma=61438).
- [SERNAC: circular sobre contratos de adhesión y cláusulas abusivas](https://www.sernac.cl/portal/618/articles-65388_archivo_01.pdf).
- [NIDDK: salud y actividad física para personas mayores](https://www.niddk.nih.gov/health-information/weight-management/healthy-eating-physical-activity-for-life/health-tips-for-older-adults).
- [Supabase: seguridad de contraseñas](https://supabase.com/docs/guides/auth/password-security).
