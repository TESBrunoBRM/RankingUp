# Cobertura del planificador de rutinas

El planificador usa un generador local de reglas. Recibe los grupos musculares
seleccionados, la duración y los días; no interpreta un chat ni consulta a un
modelo de lenguaje externo.

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
