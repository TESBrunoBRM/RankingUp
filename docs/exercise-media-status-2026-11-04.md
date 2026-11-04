# Demostraciones y racha: verificación de 1.4.1

## Cambios

- Calendario de racha con siete columnas fijas, lunes a domingo, números de día, rango de fechas, estado activo, indicador de hoy y leyenda. Los días vacíos mantienen su posición. Fechas civiles calculadas con UTC para no desplazarlas por cambio de mes u horario de verano.
- Racha disponible aunque Comunidad esté desactivada. Conserva su significado actual: visitas diarias a Home, no sesiones de ejercicio; el descanso puede contar. Contador y calendario se sincronizan con el servidor y permiten reintentar ante errores.
- Demostraciones mediante expo-image, miniaturas en la sesión, carga explícita y reintento. Si falla el GIF se intenta la imagen fija y se identifica como referencia. Las sesiones retomadas vuelven a hidratar sus fichas sin perder las series guardadas.
- Consulta al catálogo antes del respaldo local; los resultados ausentes no quedan bloqueados permanentemente en caché. Se elimina el emparejamiento parcial inseguro de nombres.
- Diecisiete equivalencias exactas de nombres en español al catálogo existente, manteniendo atribución e instrucciones. No se asigna un ejercicio con otro equipo o movimiento solo para completar un GIF.

## Evidencia y límites

El manifiesto local contiene 1.324 ejercicios, todos con ruta de GIF e imagen. Se verificaron por HTTP las 34 URLs correspondientes a las 17 equivalencias: todas respondieron 200 con Content-Type de imagen. Esto no equivale a comprobar las 2.648 URLs del catálogo ni garantiza disponibilidad futura de un proveedor externo.

Los ejercicios personalizados y algunos destacados creados por el planificador no tienen un GIF exacto disponible. Debe producirse o licenciarse una demostración específica para cerrar esa cobertura: entre otros, plancha sin carga, press militar genérico, sentadilla sin equipo, puente con pasos de talones, ángeles invertidos, curl con autorresistencia y flexiones pica. Mientras tanto se muestra la falta de demostración de forma explícita y se conservan las instrucciones disponibles. No se promete cobertura del 100 %.

Las imágenes/GIF del dataset tienen derechos separados de la licencia de los datos. Esta entrega no descarga ni redistribuye binarios del catálogo, ni acredita una licencia comercial nueva. Obtener autorización propia y alojar medios licenciados sigue pendiente antes de ampliar su distribución comercial; mantener atribución no sustituye esa autorización.

Se revisó el calendario en una vista de React Native Web de 390 px, con temas oscuro y claro. Esa comprobación no sustituye probar reproducción de GIF en un teléfono Android con el APK nuevo.

Pruebas: calendario en límites de mes, año bisiesto y fechas sin actividad; integridad de equivalencias; recuperación de caché tras fallo de red; preservación de atribución y ausencia de emparejamiento parcial. Además, suites existentes de cliente y API, TypeScript y Expo Doctor.

## Compatibilidad legal en el despliegue

El APK nuevo consulta explícitamente la versión legal 2026-11-04. El servidor conserva temporalmente soporte para la versión 2026-10-23 mostrada por APK anteriores y registra cada aceptación en su versión real: nunca traslada un consentimiento anterior al texto nuevo. Las consultas sin parámetro mantienen el comportamiento anterior. Retirar esa compatibilidad requiere una decisión posterior de actualización obligatoria y una versión nueva disponible para descargar.

La integración antivirus se documenta por separado en [image-upload-security-plan.md](image-upload-security-plan.md) y no está implementada en este APK.
