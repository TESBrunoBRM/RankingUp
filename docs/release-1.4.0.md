# RankingUp 1.4.0 · Publicación del 27 de octubre de 2026

- Código de aplicación/API: `a36c9aa2c429b4af16d2296f014d3762712c0d66`, subido a `codex/prototype-deploy`.
- Render: `dep-dbgjt7c9v7es738do150`, estado `live`, con ese commit. [API](https://rankingup-api.onrender.com/health).
- Supabase: aplicadas `weight_reports_and_history_retention` y `atomic_workout_plan`; verificados RLS, permisos de funciones y primer ciclo horario exitoso, sin sesiones vencidas ni fotos pendientes al comprobarlo.
- Android: versión 1.4.0, versionCode 6, perfil preview, build terminada. [Abrir build](https://expo.dev/accounts/brunobrm/projects/rankingup/builds/1da91b16-f816-47e1-a2b4-efcbbb5f499b) · [Descargar APK](https://expo.dev/artifacts/eas/_-CFtujaC83TmezdFSaOam5gmaTKruLL_MXpkzcSzpU.apk) (enlace temporal de EAS).
- APK local: `artifacts/RankingUp-1.4.0.apk`, 114047509 bytes. Firma válida y compatible con la versión anterior comprobada. Permiso de notificaciones presente; permiso de micrófono ausente.

## Validación

319 pruebas automatizadas aprobadas; TypeScript del cliente/API; build de API; Expo Doctor 18/18; matriz de 7200 combinaciones del planificador: 7194 planes, 6 rechazos por capacidad y cero incumplimientos observados de las reglas evaluadas. No representa una garantía clínica ni de resultados físicos.

Prueba autenticada sobre la API publicada y Supabase con una cuenta temporal: acceso anónimo rechazado, nuevo peso y estimación calórica confirmados, objetivo actualizado, plan de hipertrofia con inclinado en poleas/pec deck persistido. Se verificó también la transacción de guardado y el rollback de un plan inválido. La cuenta y los datos de prueba fueron eliminados. No se observaron errores nuevos de aplicación en los logs desde el despliegue hasta la revisión posterior a la prueba.

La entrega real del recordatorio local y el comportamiento en un teléfono siguen requiriendo la prueba física tras instalar el APK; no hubo dispositivo conectado en esta publicación.
