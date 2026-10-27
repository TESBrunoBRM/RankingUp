# Objetivos y controles del planificador

Implementación del 27 de octubre de 2026. La migración transaccional ya está aplicada en Supabase; la API y Android 1.4.0 se preparan para publicación. La planificación sigue siendo un generador determinista; el rótulo de IA no implica que consulte un modelo externo.

El cuestionario tiene cinco pasos: equipo, objetivo, músculos, tiempo y días. `trainingGoal` acepta `strength`, `hypertrophy` o `balanced`. Los clientes anteriores pueden omitirlo y conservan el enfoque equilibrado. Un objetivo desconocido se rechaza antes de guardar.

## Cómo cambia el plan

| Decisión | Fuerza | Hipertrofia |
|---|---|---|
| Selección | Prioriza compuestos y movimientos principales como banca, sentadilla, remo y press militar | Combina compuestos con accesorios; favorece variantes estables y específicas disponibles |
| Ejemplo de pecho con gimnasio comercial | Banca antes de accesorios | Inclinado en poleas y pec deck disponibles, conservando compuestos |
| Series y repeticiones iniciales | Compuesto con carga: 3 × 5; autocarga: 3 × 8; accesorio: 2 × 10 | Compuesto: 3 × 10; accesorio: 3 × 12 |
| Descanso | Compuesto con carga: 180 s; autocarga: 120 s; accesorio: 90 s | Compuesto: 120 s; accesorio: 75 s |
| Orden | Compuestos primero; repetir los movimientos principales pesa más que introducir novedad | Compuestos primero, después trabajo específico |

Estas cifras son reglas iniciales del producto, no una prescripción clínica ni la única forma válida de entrenar. No se asignan kilos ni se inventa un porcentaje de 1RM sin conocer la capacidad de la persona. Banca puede contribuir a ambos objetivos; máquinas y poleas no son exclusivas de hipertrofia. Sin equipo se respetan las alternativas de autocarga, con una advertencia sobre la dificultad de garantizar cargas altas.

La selección evita acumular variantes equivalentes solo para llenar la duración: en los nuevos enfoques limita a dos compuestos y un accesorio por músculo objetivo en cada sesión. No fuerza una cantidad de ejercicios si no caben los descansos. Los días se reparten entre la semana: dos días lunes/jueves, tres lunes/miércoles/viernes, cuatro lunes/martes/jueves/viernes. Con fuerza y hasta tres días, una selección de tren superior e inferior usa sesiones mixtas para repartir el trabajo. El plan avisa cuando algún grupo solo aparece una vez por semana o se repite en días consecutivos.

La duración incluye cinco minutos estimados de preparación, cuatro segundos por repetición, descansos entre series y un minuto de preparación/cambio por ejercicio. Para zancadas y curl con autorresistencia se contempla el trabajo en ambos lados. Es una estimación de planificación; no sustituye la medición de una sesión real ni garantiza un ritmo individual. El trabajo isométrico no tiene un contrato de duración propio en las sesiones actuales, por lo que los nuevos objetivos emplean abdominales dinámicos en vez de presentar segundos de plancha como repeticiones.

## Evaluación de decisiones

La respuesta incluye `assessment`: duración por sesión, series directas e indirectas por músculo, sesiones semanales, advertencias y motivos de selección por ejercicio. Las series indirectas no se presentan como equivalentes exactos de series directas. En hipertrofia se señala cuando algún grupo prioritario queda por debajo de diez series directas semanales, sin prometer que cualquier plan alcance ese volumen con el tiempo elegido.

Antes de persistir, un control separado vuelve a inspeccionar la salida real: número de días, equipo, ficha del ejercicio, duplicados, cobertura, límites de prescripción, compatibilidad con el objetivo, orden y tiempo. Una salida que falla ese control no se guarda. Si la solicitud no cabe, se pide ajustar días, duración o grupos.

`pnpm run audit:planner` genera una auditoría reproducible en `artifacts/planner-audit/latest.md` y `latest.json`: 7.200 combinaciones de dieciséis selecciones musculares, seis equipos, tres objetivos, cinco duraciones y cinco frecuencias. El equipo se contrasta además con las fichas del catálogo, sin confiar solo en las etiquetas del generador. Incluye ejemplos completos, fallos y solicitudes rechazadas.

El porcentaje observado de errores se refiere a incumplimientos de esas reglas en la matriz. No es un margen estadístico, validación clínica ni una probabilidad de éxito del entrenamiento. Los rechazos tampoco prueban que no exista otra distribución posible: reflejan los límites conservadores del algoritmo. El informe permite revisar precisamente qué combinaciones se rechazaron.

## Persistencia y publicación

La migración `20261027221645_atomic_workout_plan.sql` añade una función restringida a la API que guarda toda la semana en una transacción. Si un día o ejercicio falla, revierte todos los registros de esa solicitud. Los descansos se almacenan y llegan al temporizador; la descripción conserva objetivo, limitaciones y duración orientativa. Las fichas nuevas tienen instrucciones aunque no estén en el dataset externo.

Aplicar esta migración antes de desplegar la API. La migración previa de peso/retención sigue pendiente si todavía no se publicó. Compilar una app nueva para el cuestionario de cinco pasos y la presentación de descansos. No se han publicado estos cambios ni alterado rutinas previamente guardadas.

Verificación: pruebas de PostgreSQL con PGlite para guardado íntegro, rollback después de días anteriores, enum de calendario y permisos; regresiones de selección/orden/descansos por objetivo; pruebas de calorías con registros sucesivos que mantienen el objetivo nutricional. La interfaz se prueba con React Native Web y el generador real, usando navegación y persistencia simuladas.

## Fundamento y límites

La [posición ACSM de 2026](https://pubmed.ncbi.nlm.nih.gov/41843416/) encuentra ventajas de cargas mayores y prioridad al inicio para fuerza, y de mayor volumen semanal para hipertrofia. La [síntesis de ensayos de 2023](https://pubmed.ncbi.nlm.nih.gov/37414459/) también encuentra que distintas prescripciones mejoran ambas capacidades. Eso respalda diferenciar las variables del plan y evita clasificar un ejercicio como exclusivo de fuerza o hipertrofia. Los rangos exactos y las preferencias del producto son decisiones de implementación que siguen necesitando revisión individual.
