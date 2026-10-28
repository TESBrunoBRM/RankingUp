# Cobertura del planificador de rutinas

El planificador usa un generador local de reglas. Recibe los grupos musculares
seleccionados, la duración y los días; no interpreta un chat ni consulta a un
modelo de lenguaje externo.

La ampliación por objetivo (fuerza/hipertrofia/equilibrado), controles de tiempo, guardado transaccional y auditoría de combinaciones está detallada en [planner-goals-and-quality.md](planner-goals-and-quality.md). Estas capacidades están publicadas en la API y la build Android 1.4.0; véase [release-1.4.0.md](release-1.4.0.md).

## Restricciones de equipo · 27 de octubre de 2026

El equipo antes solo aparecía en la descripción. Ahora cada ejercicio declara requisitos y el generador los filtra antes de reservar la cobertura muscular. Casa sin equipo utiliza solo suelo y autocarga: no prescribe barras, bancos, máquinas ni anclajes. Se añaden fichas con instrucciones propias para las alternativas; sus detalles se pueden consultar aunque no existan en el dataset externo.

Casa separa mancuernas y bandas. Las variantes con mancuernas no suponen un banco; las bandas se sujetan bajo los pies, sin anclajes. Los clientes anteriores que envían `Casa (Mancuernas/Bandas)` reciben alternativas de autocarga, porque no se puede saber cuál de los dos materiales tienen. Parque permite dominadas; gimnasio pequeño usa un conjunto conservador sin máquinas/poleas. Se rechazan equipos desconocidos. Espalda y bíceps sin equipo tienen menor capacidad de carga; el plan lo indica. Si falta tiempo para todos los grupos, devuelve un error antes de guardar, sin sustituirlos por ejercicios de gimnasio.

Las pruebas específicas comprueban planes en casa de 2–6 días y la ausencia de bancos/barras/poleas en el modo mancuernas. Esta corrección está publicada con la versión 1.4.0; la publicación descrita más abajo corresponde a la versión anterior.

El generador anterior recorría un grupo por día y recortaba una lista concatenada
de ejercicios. Seleccionar muchos grupos podía dejar piernas al final de la lista,
sin llegar a programarlas. Los ejercicios secundarios del día también podían
quedar fuera del recorte.

Ahora se reserva primero la cobertura semanal de todos los grupos elegidos,
tanto prioritarios como secundarios. La cobertura contempla el músculo objetivo
y los secundarios de los ejercicios compuestos. Después se asignan los ejercicios
a sesiones de tren superior, empuje, tirón o piernas según la selección y los días.
El trabajo de abdomen se asigna después de los ejercicios ligados a una sesión,
para no consumir el último espacio disponible para piernas. Finalmente se rellenan
los espacios con ejercicios relacionados, favoreciendo los grupos menos cubiertos
y evitando repetir un ejercicio dentro del mismo día.

Los planes completos de 2 a 6 días reservan trabajo de cuádriceps, isquiosurales,
glúteos, pantorrillas, tren superior y abdomen. La cobertura es **semanal**; no
significa que cada sesión trabaje cada músculo de forma aislada. Si no cabe la
selección, la API devuelve un error 400 con instrucciones para ajustar días,
duración o grupos antes de crear registros. Un grupo desconocido ya no se
convierte silenciosamente en pecho o espalda.

El contrato de la API sigue siendo compatible con el APK 1.1.0: la corrección se
aplica al generar planes nuevos después de actualizar la API. No altera rutinas
ya guardadas. La selección rápida «Cuerpo completo», el resumen de grupos y los
mensajes de error mejorados en la app requieren su siguiente compilación Android.

Verificación: regresiones para planes completos de 2 a 6 días, sesiones cortas,
cambios de orden y prioridad, alias, grupos no válidos y disponibilidad de nombres
en el catálogo. También se recorren las 1.023 selecciones posibles de los diez
grupos con dos distribuciones de prioridades (2.046 combinaciones), y se comprueba
que el servicio guarde la sesión de piernas y rechace un plan imposible antes
de escribir registros.

La planificación sigue siendo orientativa; no añade una evaluación clínica ni
modifica los avisos de seguridad de la app.

## Publicación y prueba real

La corrección se publicó el 25 de octubre de 2026 en Render, despliegue
`dep-dbf2h1cs728c73dsrfu0`, commit `23f3ee6`. Con una cuenta temporal se generó un
plan completo de tres días mediante la API publicada: se guardaron las sesiones
de empuje, tirón y piernas. Esta última incluyó sentadilla, peso muerto rumano y
elevaciones de pantorrillas. Una solicitud completa de un solo día y 30 minutos
devolvió 400 sin crear registros adicionales. Se eliminaron la cuenta y las rutinas
temporales al terminar la comprobación.
