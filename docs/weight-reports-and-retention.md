# Informes de peso y retención de entrenamientos

Publicado el 27 de octubre de 2026, hora de Chile. Se verificaron la migración, los permisos y el primer ciclo horario. La API está en línea y el APK Android 1.4.0 está compilado y firmado. Véase [release-1.4.0.md](release-1.4.0.md).

## Informes

La pestaña **Informes** aparece al habilitar Ejercicios o Nutrición; también es accesible desde Ajustes. Incluye peso actual, objetivo opcional en kg, variación semanal, gráfico y registros históricos con páginas de 30 mediciones. Está disponible sin Pro.

- `GET /v1/weight-reports?before=YYYY-MM-DD`: historial descendente con cursor exclusivo. El encabezado siempre corresponde a la medición más reciente, incluso en páginas antiguas.
- `POST /v1/weight-reports`: `{ weight, timeZone }`, entre 30 y 300 kg y hasta dos decimales. El servidor calcula la fecha local. Registrar otra vez el mismo día corrige esa medición. Perfil, medición y estimación calórica se guardan en una transacción; perfiles sin datos nutricionales conservan su meta calórica.
- `PATCH /v1/weight-reports/target`: `{ targetWeight }`; `null` quita el objetivo. Cambiarlo no altera la dirección del objetivo nutricional.

Todos los endpoints requieren sesión y toman el usuario de la identidad autenticada. `weight_logs` tiene RLS, sin acceso directo para `anon`/`authenticated`; solo la API con `service_role` puede operarla. No se exponen estas mediciones en el perfil público. Los cambios de peso desde Datos físicos o el onboarding también generan una medición a partir de la actualización; el peso ya existente al migrar no se copia con una fecha de pesaje inventada.

La comparación toma el registro más reciente y busca una medición de entre 7 y 14 días antes. Muestra la fecha usada. Sin referencia suficiente muestra **Sin comparación**, sin inferir una variación cero. El gráfico conserva la distancia real entre fechas y muestra la meta con una línea discontinua.

Informes avanzados, personalización Pro y programas de profesionales siguen indicados como próximos; no se ofrecen como funciones disponibles.

Informes también muestra la estimación calórica diaria confirmada por el servidor. Guardar cada peso nuevo la recalcula manteniendo subir/bajar/mantener; al volver a Nutrición se carga la meta actualizada. Las pruebas usan pesos sucesivos para comprobar que se toma el peso nuevo y no el anterior. No se aplican incrementos fijos arbitrarios: el cambio resulta de la fórmula existente y los datos físicos disponibles.

## Notificaciones

`expo-notifications` programa un aviso local repetido cada 604800 segundos, sin servidor de push. Está desactivado inicialmente y solo solicita permisos cuando la persona lo activa. Android crea el canal antes de solicitar permiso. No se solicitan alarmas exactas.

- Al registrar peso desde Informes se reinicia el intervalo de 7 días si el aviso estaba habilitado.
- La preferencia se guarda por cuenta y dispositivo; no incluye valores de peso.
- Al cerrar sesión o cambiar de cuenta se cancelan los avisos de la cuenta anterior; al volver se puede restaurar su preferencia. Las operaciones se serializan para evitar carreras.
- También se cancelan si se desactivan tanto Ejercicios como Nutrición; solo se restauran cuando Informes vuelve a estar habilitado.
- Al revocar permisos, la sincronización cancela el aviso y el interruptor se muestra desactivado. La app no vuelve a solicitar permiso automáticamente.
- Al pulsar el aviso se abre Informes después de los pasos de acceso/configuración, únicamente si la cuenta coincide.
- Web permite ver y registrar informes; el recordatorio se ofrece en Android/iOS.

La hora de entrega puede ajustarse por el sistema operativo. El guardado de peso no depende de que la reprogramación funcione. Referencia: [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/); implementación contrastada con los tipos instalados de Expo SDK 54.

## Retención de 14 días

La migración `20261027214157_weight_reports_and_history_retention.sql` habilita `pg_cron` y programa `rankingup-workout-retention` cada hora. El trabajo elimina sesiones de `workout_logs` con fecha anterior a `now UTC - 14 days`, sus series y las publicaciones/likes asociados por las relaciones existentes. La eliminación física puede tardar hasta el siguiente ciclo horario; las consultas de historial y de fuerza/progresión excluyen lo vencido inmediatamente.

Antes de borrar, conserva temporalmente las rutas de fotos asociadas en una cola privada. El worker de API elimina esas fotos usando la API de Storage y retira las rutas solo después del éxito. Procesa lotes de 100 al arrancar y cada hora, con reintentos tras fallos. La limpieza de filas sigue funcionando aunque Render esté suspendido; las fotos pendientes se eliminan al reanudarse la API.

Se conservan rutinas planificadas, XP acumulada, perfiles y evolución de peso. Las marcas y recomendaciones derivadas de series pasan a basarse en la ventana de 14 días. Los reportes/auditoría de moderación existentes mantienen su propia política; esta migración no elimina sus evidencias. Las copias de seguridad del proveedor tienen su retención independiente.

La caché de respuestas móviles tiene un límite de 100 entradas y descarta respuestas vencidas o de otras cuentas. No hay un archivo persistente de sesiones de entrenamiento en el cliente.

## Publicación y validación

1. Aplicar la migración de Supabase antes de desplegar esta API. Confirmar en `cron.job` el trabajo `rankingup-workout-retention` y revisar `cron.job_run_details` después del primer ciclo. Referencia: [Supabase Cron](https://supabase.com/docs/guides/cron).
2. Desplegar la API, incluyendo los endpoints de peso y el worker de fotos.
3. Generar un nuevo APK/IPA: `expo-notifications`, `expo-image`, icono y splash requieren recompilación nativa.
4. En dispositivo físico: habilitar el aviso, comprobar permisos/canal, abrir Informes desde una notificación y probar cierre/cambio de cuenta. No se comprobó la entrega real en un teléfono durante esta implementación.

Pruebas automatizadas: generación sin equipo para 2–6 días, restricciones de equipo, aislamiento por usuario, fechas, límites de valores, paginación y comparación semanal; PostgreSQL con PGlite verifica transacciones, repetición del mismo peso, privilegios, limpieza de series/fotos en cola y conservación de XP/peso. PGlite ejecuta el SQL de la migración salvo la instalación/programación de `pg_cron`, que debe verificarse al publicarla en Supabase.

La vista se revisó con React Native Web y datos ficticios: guardado con coma decimal actualiza peso/variación/gráfico, navegación a páginas anteriores, regreso al período reciente y estado vacío. La exportación Android con Metro valida el código y los recursos; no equivale a una prueba de entrega de notificaciones ni a generar un APK.
