# Monetización y bolsa de IA

Estado: integración preparada y validada en pruebas. **No hay cuentas de Google Play, RevenueCat ni AdMob configuradas todavía.** La API usa `MONETIZATION_MODE=disabled` por defecto: no cobra ni aplica cuotas a las cuentas existentes. No se debe anunciar la contratación como disponible hasta terminar la configuración y las pruebas de tienda.

## Modelo

- Gratis: entrenamientos manuales, alimentación básica e historial. Una sola bolsa de **3 usos mensuales** para planificación de rutinas y análisis de alimentos, compartida entre dispositivos.
- Un resultado completado descuenta 1. Los fallos devuelven la reserva. Se conserva una clave de idempotencia al reintentar tras un fallo de conexión; un resultado completado no se ejecuta ni cobra otra vez con esa clave.
- Un anuncio voluntario y confirmado por Google devuelve 1, hasta un saldo disponible de 3. Se pueden recuperar nuevos usos después de gastarlos. Ningún botón o callback del teléfono puede concederlos por sí solo.
- Reinicio el día 1 a las 00:00 de `America/Santiago`, sin acumulación entre meses.
- Pro vigente y verificado: IA sin esta cuota mensual. Los límites técnicos de frecuencia contra abuso siguen activos.
- Precio propuesto: **CLP $2.990/mes o $24.990/año**. Cuando haya productos configurados, el precio del botón provendrá de la tienda.
- Informes avanzados, más personalización, programas profesionales y herramientas para entrenadores quedan en el roadmap. No se implementan ni se ofrecen como beneficios ya disponibles en esta entrega.

## Servidor

`BillingModule` expone el estado del plan, sincronización de compras y desafíos de anuncios. `AiCreditsInterceptor` protege `POST /v1/workouts/generate-plan` y `POST /v1/foods/analyze-image`. Toda nueva función de IA debe utilizar esta misma frontera; los registros manuales y el cálculo ordinario de referencias nutricionales no pasan por ella.

La migración `20261025195626_monetization.sql` crea cuentas, saldos por mes, solicitudes idempotentes y desafíos de recompensa. Las transacciones bloquean una fila por cuenta para coordinar peticiones simultáneas de distintas funciones. El proveedor de IA se llama fuera de la transacción, manteniendo los bloqueos cortos.

Las tablas tienen RLS y no conceden acceso a `anon`/`authenticated`. Las RPC son `SECURITY INVOKER`, ejecutables únicamente por `service_role`. El aviso informativo de Supabase «RLS enabled, no policy» es intencional en estas tablas privadas del servidor; no se deben añadir políticas públicas para silenciarlo. [Referencia del aviso](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Después de persistir un resultado, un error al registrar su finalización mantiene la reserva pendiente para evitar volver a ejecutar trabajo ya guardado. Una reserva pendiente prolongada requiere reconciliación por soporte: comprobar el resultado y finalizar o devolver la reserva con la RPC del servidor. No devolver reservas antiguas automáticamente sin comprobar si el trabajo terminó. No existe un endpoint público para alterar saldos o concederse Pro.

## Compras: preparación de RevenueCat

1. Crear el proyecto de RevenueCat para `com.brunobrm.rankingup` y comenzar con **Test Store**. Configurar entitlement `pro`, productos mensual/anual y un offering actual que incluya ambos paquetes.
2. Guardar la clave SDK pública `test_…` en `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` para pruebas. El cliente rechaza una clave de tienda real cuando el servidor indica modo `test`, para evitar un cobro real por configuración equivocada. Las claves secretas nunca van en `EXPO_PUBLIC_*`.
3. Configurar `REVENUECAT_SECRET_KEY` y `REVENUECAT_ENTITLEMENT=pro` en el servidor de pruebas. El usuario de RevenueCat es el UUID de Supabase, sin enviar datos físicos o de alimentación al proveedor de compras.
4. Configurar el webhook `POST /v1/billing/callbacks/revenuecat`, con un valor privado de Authorization igual a `REVENUECAT_WEBHOOK_AUTH`. El servidor consulta el estado actual de RevenueCat en lugar de aplicar eventos fuera de orden. Contempla transferencias entre identificadores.
5. En `MONETIZATION_MODE=test` solo se acepta una suscripción sandbox verificada; en `live`, solo una suscripción comercial verificada. Una suscripción expirada deja de dar Pro. Los estados de prueba no habilitan Pro al cambiar a comercial.
6. Probar compra, restauración, cancelación, expiración, reembolso y cambio de cuenta. Después crear los productos reales de Google Play y completar sus pruebas de licencia. La confirmación del SDK por sí sola no desbloquea la API: siempre se sincroniza con el servidor.

## Anuncios: preparación de AdMob

1. Crear la app y una unidad **rewarded**, con recompensa de cantidad **1**. Configurar SSV con `GET /v1/billing/callbacks/admob`.
2. Configurar el ID de la app y la unidad en las variables públicas del cliente, y la unidad esperada en `ADMOB_REWARDED_AD_UNIT` del servidor. Los IDs por defecto de la configuración nativa son los oficiales de Google para pruebas.
3. Completar la configuración de consentimiento de Google. La app solicita consentimiento antes de inicializar o cargar anuncios, ofrece acceso a preferencias cuando Google lo exige y solicita anuncios sin personalización. No se envían peso, edad, comidas ni objetivos como criterios publicitarios.
4. El anuncio solo comienza después de una acción voluntaria. Se limpian los listeners al finalizar; salir de la pantalla cancela una carga pendiente. Cerrar antes de ganar la recompensa no concede usos.
5. La API crea un desafío con usuario, mes y caducidad de 20 minutos. Su UUID se envía como `customData` y el UUID del usuario como `userId`. El servidor verifica la firma ECDSA con claves de Google, la unidad, cantidad, fecha, usuario y desafío. Cada transacción y desafío se aplican una sola vez.
6. `EARNED_REWARD` solo hace que la app consulte la confirmación del servidor. Si SSV tarda, la pantalla permite comprobarla sin exigir otro anuncio.
7. En pruebas nativas usar `TestIds.REWARDED`. Las unidades de muestra no tienen configurado nuestro callback SSV: ver un anuncio de muestra **no demuestra** una recompensa real en la API. La ruta de verificación se prueba con firmas de prueba controladas y con la herramienta de prueba SSV del panel de AdMob cuando exista la cuenta.

No activar anuncios reales hasta completar el alta del proveedor, su consentimiento, las declaraciones de datos de la tienda y la información comercial/de privacidad de la app. Revisar la versión de los términos y su aceptación al lanzar estas condiciones comerciales.

## Variables y activación

Las variables están documentadas en `.env.example`. Los modos son `disabled`, `test` y `live`; un valor desconocido se trata como desactivado. La migración está aplicada, pero no cambia el comportamiento de usuarios existentes mientras el modo esté desactivado.

Para ensayar con proveedores configurados, arrancar una API de pruebas con `MONETIZATION_MODE=test` y generar un APK que apunte a esa API. No cambiar el modo de producción como sustituto de un entorno de pruebas.

SDKs fijados: `react-native-purchases@10.15.1` y `react-native-google-mobile-ads@16.0.0`. Esta última incluye Google Ads Android 24.6.0 y UMP 3.2.0, compatibles con Kotlin 2.1.20 de React Native 0.81 / Expo SDK 54. Ads 17 requiere React Native 0.86 o superior; la versión 16.5 también resulta incompatible aquí porque incluye Google Ads 25.4.0 con metadatos de Kotlin 2.3. No basta con revisar los peer dependencies de npm: comprobar además las versiones nativas antes de actualizar.

### Corrección de la primera build 1.3.0

La build `7b1502f9-bcd4-4b2c-b76a-1d17b26d15dc` falló en `:react-native-google-mobile-ads:compileReleaseKotlin` por metadatos 2.3.0 cuando el compilador esperaba 2.1.0. Se fijó la versión 16.0.0 del wrapper y se actualizó el lockfile. Se inspeccionó el `classes.jar` del AAR oficial de Google Ads 24.6.0: sus 16 archivos `.kotlin_module` declaran versión 2.1.0. La corrección conserva el Kotlin de Expo y no desactiva la validación de metadatos. La compilación Android en EAS es la comprobación final.

## Validación realizada

- Pruebas PostgreSQL reales con PGlite: bolsa compartida, concurrencia, reintentos, reinicio de mes, devolución, caducidad de Pro, aislamiento de pruebas, duplicados y privilegios.
- Pruebas de servidor: cuota agotada antes del proveedor, respuestas cacheadas, errores, firmas alteradas y compras sandbox/comerciales.
- Prueba HTTP de la API local contra Supabase con una cuenta temporal: tres planes, cuarto uso 402, alimentación bloqueada con la misma bolsa, recompensa de prueba +1, fallo devuelto y Pro de prueba sin descuento. La cuenta y todos sus datos se eliminaron al terminar.
- Vista de React Native Web con datos de prueba para revisar «Mi plan». No sustituye las pruebas del SDK nativo ni una compra/anuncio real.
- El script de Jest usa `--experimental-vm-modules` para la carga WASM de PGlite. Esta opción solo afecta las pruebas de API.

## Skills y documentación

Se usó `find-skills` para localizar y comprobar las fuentes. Instaladas: [Google Mobile Ads rewarded](https://skills.sh/google/skills/google-mobile-ads-rewarded) (5,9 mil instalaciones; repositorio oficial de Google, más de 21 mil estrellas al consultar) e [integrate-revenuecat](https://skills.sh/revenuecat/ai-toolkit/integrate-revenuecat) (aproximadamente mil instalaciones; repositorio oficial del proveedor, 75 estrellas al consultar). La segunda se eligió por ser la guía del proveedor pese a ser más reciente y tener menos estrellas. No se interpretan las estrellas como una auditoría de seguridad.

Referencias técnicas: [SSV de Google](https://developers.google.com/admob/android/ssv), [SDK de compras para Expo](https://www.revenuecat.com/docs/getting-started/installation/expo), [anuncios rewarded para React Native](https://docs.page/invertase/react-native-google-mobile-ads/ad-formats/rewarded).

## Publicación de la preparación · 25 de octubre de 2026

- Código subido: `b94220f94527ac0fbf6b286b3a73fa676e75735e` en `codex/prototype-deploy`.
- Migración aplicada: `20261025195626_monetization`. Se verificó RLS y ausencia de permisos de lectura de `anon` o actualización de clientes en las cuatro tablas.
- API Render: despliegue `dep-dbf63avb9u1s73boi54g`, estado `live`. Una prueba autenticada confirmó `mode=disabled`, saldo sin límite activo, compras/recompensas no disponibles y acceso anónimo rechazado. La cuenta temporal se eliminó.
- Verificación: 247 pruebas de API y 8 de acceso/configuración, TypeScript de app/API, build de API y Expo Doctor 18/18. Sin conflictos de peer dependencies.
- [Build Android 1.3.0, código 4](https://expo.dev/accounts/brunobrm/projects/rankingup/builds/7b1502f9-bcd4-4b2c-b76a-1d17b26d15dc): solicitud y subida aceptadas; compilación dejada en ejecución. Las cuentas y claves de proveedores siguen pendientes, por lo que no se afirma haber completado una compra o anuncio real ni el arranque autenticado de esos SDKs.
