# Propuesta de negocio para RankingUp

Fecha: 25 de octubre de 2026. Propuesta para decidir el siguiente desarrollo; esta versión no activa suscripciones ni limita las cuentas existentes.

## Recomendación: Gratis + RankingUp Pro

El valor inicial es ayudar a mantener el hábito con ejercicios, alimentación y progreso en una experiencia sencilla. La elección de módulos debe seguir siendo independiente del plan comercial: alguien que solo quiere ejercicios no tiene que activar alimentación o comunidad para pagar o usar la app.

| Plan | Valor propuesto | Precio para validar |
| --- | --- | --- |
| Gratis | Registro de entrenamientos, rutinas manuales, historial personal, alimentación y agua básicos, comunidad opcional, privacidad y avisos de seguridad. | Gratis |
| Pro | Informes de volumen y distribución muscular, tendencias y comparación entre semanas, exportación avanzada para compartir con un profesional, programas y personalización adicionales. Más adelante, planificación adaptativa con uso limitado según coste. | Hipótesis: CLP $2.990/mes o $24.990/año. |
| Entrenadores, después | Panel de alumnos que acepten vincularse, asignación de programas y seguimiento. Cada entrenador paga por un tramo de alumnos activos. | Definir mediante pilotos con entrenadores. |

Los precios son hipótesis para entrevistas y pruebas de disposición a pagar, no tarifas publicadas ni cálculos de rentabilidad. El descuento anual propuesto equivale aproximadamente a un 30% frente a doce pagos mensuales. Evitar la oferta de por vida mientras haya costes recurrentes de almacenamiento o IA.

No bloquear la consulta del historial ya generado al cancelar. Mantener gratuitos los controles de privacidad, las advertencias, la elección de funciones y el acceso a los datos personales. La exportación avanzada puede ser Pro; el acceso y ejercicio de derechos sobre los datos no debe depender de la suscripción.

## Qué vender primero

1. **Informes útiles:** balance de entrenamiento por grupo muscular, evolución semanal y un informe para revisar con un entrenador. Validar primero que los datos y las explicaciones aportan algo que el usuario pagaría.
2. **Programas:** ciclos de varias semanas creados y revisados por profesionales identificados. Se pueden vender como packs independientes cuando exista contenido y una distribución contractual clara con el autor.
3. **Herramientas para entrenadores:** probar con un grupo pequeño antes de construir un marketplace completo. Es una vía de ingresos recurrentes con menos dependencia de conseguir muchos suscriptores individuales.

El planificador actual usa reglas del servidor. No presentar una suscripción como asesoría clínica ni prometer un entrenador de IA adaptativo antes de implementar y comprobar esa capacidad. Si se integra un proveedor de IA, definir cuotas en el servidor, coste máximo por usuario y comportamiento al agotar el cupo.

## Cómo mostrarlo sin invadir

- Acceso a «Mi plan» dentro de Ajustes cuando exista un producto de pago real.
- Mostrar la oferta al solicitar una función Pro concreta, con el beneficio y el precio completo visibles.
- Un único cierre claro, sin pantallas de pago al terminar cada entrenamiento ni banners permanentes en Inicio.
- Explicar periodo, renovación, cancelación y restauración de compras antes de contratar. Al cancelar, mantener acceso hasta terminar el periodo abonado.
- No vender datos de salud ni conceder XP, posiciones de ranking o ventajas competitivas por pagar.

## Orden de implementación

1. Entrevistar usuarios activos y entrenadores, mostrar prototipos de informes y comparar el interés por mensual/anual/packs.
2. Construir un informe Pro útil y probarlo con un grupo voluntario. Medir activación (primer entrenamiento), retorno a 7 y 30 días y demanda de la función.
3. Elegir canal de distribución y facturación. El APK de prueba actual no proporciona una integración de Google Play Billing. Preparar el entorno de tienda y pruebas de compras antes de ofrecer suscripciones allí.
4. Implementar productos y permisos en servidor, verificación de compras, notificaciones/webhooks idempotentes, restauración y estados activo/cancelado/vencido/reembolsado. Nunca confiar en un booleano Pro guardado en el teléfono.
5. Probar compras y cancelación en sandbox, fijar condiciones comerciales y publicar precios solo tras aprobar la oferta final.
6. Medir conversión, cancelación, coste por suscriptor y soporte. Comparar ingreso neto con comisiones del canal, impuestos aplicables, IA, infraestructura y devoluciones. No estimar beneficio a partir del precio bruto.

## Referencias consultadas

La propuesta y los precios de RankingUp son una recomendación propia, no una copia de las tarifas de otros productos.

- [Hevy: diferencias Gratis/Pro](https://help.hevyapp.com/hc/en-us/articles/35119778922263-Hevy-Pro-Subscription-How-to-get-Pro-and-What-Does-It-Include): combina una base gratuita con límites de rutinas y funciones de análisis adicionales. Referencia del modelo freemium; no adoptamos su restricción del historial.
- [Fitbod: preguntas frecuentes](https://fitbod.me/faqs/): publica USD $15,99 mensual y $95,99 anual para compras en su web. Referencia de otra categoría de personalización, no precio local equivalente ni tarifa de RankingUp.
- [Google Play: comisiones](https://support.google.com/googleplay/android-developer/answer/112622?hl=en): describe tarifas y excepciones regionales; para los mercados restantes mientras se despliegan los cambios, indica 15% en suscripciones autorrenovables. Verificar condiciones por país y canal al integrar pagos.

Las fuentes y sus condiciones pueden cambiar; revisar de nuevo antes del lanzamiento comercial.
