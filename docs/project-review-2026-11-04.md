# RankingUp: revisión de producto, riesgos y competencia

Fecha de consulta: 4 de noviembre de 2026. Mercado inicial supuesto: Chile. Revisión del repositorio y de fuentes oficiales; no es un pentest, dictamen jurídico, estudio clínico ni prueba de todas las apps competidoras. Ningún análisis puede cubrir literalmente todos los incidentes posibles. Esta matriz delimita los escenarios identificados y cómo cerrar sus riesgos. Precios y funciones de terceros pueden variar por país, plataforma y fecha; no se convirtieron tarifas internacionales a CLP.

## 1. Diagnóstico del proyecto

Expo 54 / React Native 0.81, API NestJS y Supabase. El producto reúne rutinas, sesiones e historial, objetivos de planificación, nutrición manual y por imagen, peso e informes, rangos, rachas, publicaciones y duelos. Los módulos se eligen durante la guía inicial. La versión pública revisada es 1.4.0; este informe distingue código existente de integraciones activadas en producción.

**Fortalezas verificables en código:** guardado de aceptaciones por usuario/versión, guía modular, advertencias de seguridad, privacidad del perfil, API autenticada, revisión de estimaciones nutricionales, reservas de crédito e idempotencia, verificación de compras y recompensas en servidor. El planificador usa reglas y controles por objetivo; el reconocimiento de comida utiliza Google Gemini. No describir ambos como un entrenador clínico o una IA que aprende automáticamente del usuario. La presencia de pruebas o código no demuestra por sí sola configuración correcta en producción.

**Brechas:** no se encontró un flujo integral de eliminación de cuenta/exportación de datos; hay eliminación de registros/fotos concretos, que es distinta. No se verificaron región efectiva de proveedores, contratos, plazos de retención globales ni gestión de solicitudes. Tampoco se acreditaron consentimiento específico para datos sensibles, control integral de menores, moderación operativa con tiempos de respuesta, adaptación clínica o eficacia de prevención de lesiones. Los informes de peso ya existen en 1.4.0; deben distinguirse de los futuros informes Pro. Revisar el texto comercial para evitar vender como exclusivo algo ya gratuito.

## 2. Marco legal y límites

La responsabilidad por información incorrecta puede explicarse, pero no convertirse en una exención general por defectos de RankingUp, negligencia o derechos irrenunciables. La aceptación no acredita aptitud física. El [texto refundido de la Ley 19.496](https://www.bcn.cl/leychile/navegar?idNorma=1160403) contempla información sobre riesgos y control de cláusulas abusivas, entre otros deberes. La aplicación concreta al modelo gratuito/pagado y a cada reclamación requiere revisión jurídica.

La [Ley 19.628, artículo 10](https://www.suseso.gob.cl/613/w3-propertyvalue-121276.html) contiene reglas especiales para datos sensibles. La [Ley 21.719](https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idParte=10527471&idVersion=2026-12-01), con entrada en vigor el 1 de diciembre de 2026, exige preparar la transición; no se presenta aquí como ya vigente el 4 de noviembre. Validar bases de licitud, consentimiento cuando corresponda, derechos, seguridad, contratos e internacionalización con asesoría chilena. No importar mecánicamente plazos del RGPD ni afirmar que un checkbox resuelve todo.

Para Google Play, una app con creación de cuentas debe ofrecer una vía dentro de la app y un recurso web para solicitar eliminación de cuenta y datos asociados: [política oficial](https://support.google.com/googleplay/android-developer/answer/13327111). Una dirección de correo aislada en términos no acredita por sí sola toda esa implementación.

## 3. Matriz de escenarios

P0: resolver antes de apertura comercial amplia o del tratamiento correspondiente. P1: siguiente iteración. P2: expansión. «Texto» significa mejora informativa aplicada; no prueba que el control operativo esté completo.

| Caso | Riesgo / medida necesaria | Situación y prioridad |
|---|---|---|
| Persona mayor que solo quiere ejercicios | Guía gradual, texto ampliable, módulos opcionales, no confundir selección con evaluación de aptitud | Modularidad existente; pruebas con personas mayores pendientes. P1 |
| Sedentarismo o regreso tras pausa | Inicio conservador y revisión de carga; nunca prometer un plan seguro solo por aceptar | Avisos existentes, adaptación longitudinal pendiente. P1 |
| Lesión previa, cirugía o discapacidad | No prescribir rehabilitación; alternativas revisadas por profesional | Texto reforzado; validación profesional pendiente. P0 para recomendaciones clínicas |
| Dolor torácico, desmayo, falta de aire intensa | Detener actividad y atención urgente; soporte no es emergencia | Texto existente preservado. P0 |
| Carga excesiva, mala técnica o equipo inadecuado | Instrucciones y sustituciones verificadas; límites de volumen y avisos junto al ejercicio | Cobertura del plan no equivale a seguridad técnica. P1 |
| Embarazo, lactancia o enfermedad crónica | Evitar metas clínicas y recomendaciones automáticas no evaluadas | Texto reforzado; controles específicos pendientes. P0 |
| Datos falsos o unidades equivocadas | Validación de rangos/unidades y confirmación; atribución causal proporcional | Deber de exactitud sin exención absoluta. Texto aplicado; ampliar pruebas P1 |
| Menor de edad | Definir público, representación y base de tratamiento; propuesta inicial: orientar lanzamiento a adultos | No se certifica un bloqueo integral de menores. P0 |
| Deterioro cognitivo o representante | Consentimiento comprensible y representación válida, no delegación informal | Texto aplicado; proceso pendiente. P0 |
| Trastorno alimentario o metas extremas | Permitir ocultar calorías/peso; evitar mensajes culpabilizantes y déficits agresivos | Advertencias existentes; modo sin calorías propuesto. P1 |
| Alergias, ingredientes ocultos | Escáner no determina seguridad alimentaria; exigir etiqueta/criterio profesional | Texto aplicado; no prometer detección de alérgenos. P0 |
| Hidratación y restricción de líquidos | Meta orientativa, indicaciones profesionales prevalecen | Texto existente. P0 |
| IA inventa plato, porción o nutrientes | Revisión humana antes de guardar, incertidumbre visible, fallo sin crédito consumido | Validaciones y notas existentes; calibración pendiente. P1 |
| Foto con rostro, documento o tercero | Aviso antes de envío, minimizar/cortar foto y evitar datos ajenos | Proveedor Gemini identificado; consentimiento contextual pendiente. P0 |
| Perfil público o publicación accidental | Audiencia visible y confirmación, no inferir que desactivar Comunidad privatiza | Texto y privacidad existentes; revisar todos los endpoints. P0 |
| Capturas y republicaciones | Explicar límites de retirada y atender solicitudes contra usos ilícitos | Texto aplicado; no prometer retirar copias ajenas. P1 |
| Acoso, desnudos o consejo peligroso | Reportar, bloquear, moderar, apelación y responsables | Reportes/admin existen; proceso completo no acreditado. P0 para expansión social |
| Duelo o racha provoca sobreesfuerzo | Salida clara sin penalización humillante; XP por constancia y descanso | Texto existente; rediseño de incentivos propuesto. P1 |
| Ranking falso o trampa | Verificación de servidor no equivale a certificación de movimiento | No afirmar que cada repetición fue validada. P1 |
| Robo de cuenta o filtración | Revocación de sesiones, registro de incidente y comunicaciones legales | Autenticación existente; simulacro y procedimiento pendientes. P0 |
| Eliminación de cuenta | Borrar relaciones, archivos y accesos; explicar excepciones/backups | No se encontró flujo integral. P0 |
| Acceso, corrección, oposición o retiro | Canal gratuito, verificación proporcional y registro de atención | Contacto accionable añadido; SLA/proceso pendientes. P0 |
| Cambio de finalidad o proveedor | Información previa y nueva base/consentimiento cuando corresponda | No queda autorizado por aceptar genéricamente. P0 |
| Procesamiento fuera de Chile | Inventario de regiones, contratos y garantías de transferencias | Nombres de proveedores publicados; regiones no verificadas. P0 |
| Retención indefinida | Plazos por categoría, depuración comprobable y tratamiento de respaldos | Limpieza específica de fotos no cubre toda la cuenta. P0 |
| Cobro duplicado, restauración o pérdida de Pro | Verificar recibos/estado, canal de reclamación y pruebas reales de tienda | Preparación existente; activación comercial no verificada. P0 |
| Cancelación, reembolso o retracto | Mostrar periodo/precio/renovación; desinstalar no cancela; conservar derechos | Texto añadido; comprobar canal de compra antes de activar. P0 |
| Cuota mensual, timeout o reintento | Bolsa compartida, zona horaria, devolución e idempotencia | Implementado; pruebas de concurrencia existentes. P1 |
| Anuncio incompleto o sin inventario | Voluntario, recompensa solo al verificar, registro manual siempre disponible | Integración preparada; prueba real y privacidad pendientes. P0 |
| Función futura anunciada como disponible | Separar propuesta de beneficio contratado | Texto añadido; revisar oferta completa. P0 |
| Caída del servicio o pérdida de registros | Estado/error claro, reintentos seguros, respaldo/restauración y soporte | No prometer disponibilidad absoluta. P1 |
| Licencia de fotos, ejercicios o noticias | Registrar procedencia, permisos y atribuciones | Auditoría documental de todos los activos pendiente. P1 |
| Mercado fuera de Chile | Revisar edad, salud, consumo, privacidad, impuestos y tiendas por país | No asumir que estos términos cubren automáticamente otros territorios. P2 |

### Evidencia operativa que falta

Responsable: confirmar identidad legal, domicilio y correo operativo configurados. Datos: inventariar tablas, buckets, logs, copias y destinatarios; definir fines, bases, retención y borrado por categoría. Proveedores: comprobar plan de Gemini y condiciones de uso/retención, región de Supabase y Render, contratos y configuración publicitaria. No afirmar que Google no usa imágenes para mejorar servicios sin comprobar las condiciones del proyecto concreto.

Implementar consentimientos separados y revocables para tratamientos opcionales, manteniendo funcionalidades manuales donde proceda. Determinar con abogado cuándo el tratamiento de datos sensibles requiere consentimiento específico. Guardar versión y evidencia de cada finalidad, no solo del contrato completo. Ejecutar ejercicios de derechos y de incidentes antes de declarar cumplimiento. Mantener registro de casos y política de moderación accesible.

## 4. Investigación competitiva

Se revisaron nueve productos desde documentación oficial pública. Las siguientes son capacidades anunciadas por sus proveedores; no se verificó su rendimiento ni la ausencia de otras funciones. No se comparan estrellas ni cifras de usuarios como evidencia de calidad. «Oportunidad» es una inferencia de producto, no una exclusividad demostrada.

| Competidor / fuente | Valor anunciado | Implicación para RankingUp |
|---|---|---|
| [Hevy](https://help.hevyapp.com/hc/en-us/articles/35119778922263-Hevy-Pro-Subscription-How-to-get-Pro-and-What-Does-It-Include) | Registro, componente social; 4 rutinas gratis, 7 ejercicios propios; Pro amplía límites y añade Trainer | Social + rutinas + planes ya existe. Competir en claridad, modularidad y constancia; no en copiar el feed |
| [Strong](https://www.strong.app/) | Diario de entrenamiento sencillo, estadísticas, Apple Watch, exportación | Rapidez de registro y portabilidad deben ser básicos; reducir pasos antes de añadir IA |
| [Fitbod](https://help.fitbod.me/hc/en-us/articles/360004904714-How-to-Subscribe-to-Fitbod) | Recomendaciones personalizadas e informes; web USD 15,99/mes o 95,99/año | Precio de referencia internacional, no tarifa chilena. Necesitamos adaptación explicable y resultados fiables |
| [Freeletics](https://www.freeletics.com/en/bodyweight-training/) | Coach con feedback, entrenamiento corporal y ajustes a contexto como espacio/ruido | Planificar según equipo, tiempo y restricciones reales; no etiquetar un campo de texto como filtro funcional |
| [Nike Training Club](https://www.nike.com/au/ntc-app?channel_appview=true) | Entrenamientos y programas gratuitos para miembros Nike | «Rutinas gratis» no es una ventaja suficiente. Calidad de demostraciones e instrucciones es una referencia |
| [MyFitnessPal](https://support.myfitnesspal.com/hc/en-us/articles/34889191368077-The-difference-between-Free-Premium-and-Premium) | Registro alimentario; Premium añade escaneo y análisis; Premium+ amplía planificación | Una foto con IA no diferencia por sí sola; priorizar corrección de porciones y confianza |
| [Fitia](https://fitia.app/es/) | Registro por foto/voz/texto/código, macros y planes personalizados en español | Español y alimentos regionales son expectativas, no exclusividad. Crear calidad local verificable |
| [Cronometer](https://cronometer.com/blog/free-features/) y [Gold](https://cronometer.com/gold/) | Datos nutricionales de fuentes analizadas/verificadas; más herramientas e informes de pago | Mostrar procedencia y distinguir verificado de estimado es más valioso que solo ampliar el catálogo |
| [JEFIT](https://www.je.fit/features) | Diario, temporizadores y superseries; oferta Free/Elite | El flujo durante la sesión debe ser sólido; no esconder el uso básico detrás de una cuota de IA |

[Strava](https://support.strava.com/en-us/articles/15401916-strava-challenges) se revisó adicionalmente como referencia de retos y comunidad: demuestra que la competición social tampoco es exclusiva. Sus necesidades de privacidad y moderación son una advertencia útil, aunque no sea el rival principal de un diario de fuerza.

### Qué tenemos de valor agregado

La combinación de módulos elegibles, gamificación de fuerza y nutrición en un solo flujo constituye una **propuesta de combinación**, no una tecnología exclusiva. Los duelos y rangos pueden atraer, pero deben premiar hábitos sostenibles en lugar de volumen extremo. La bolsa compartida de tres usos es una regla de monetización; no es por sí misma un beneficio diferencial. Un precio CLP 2.990 mensual / 24.990 anual sigue siendo hipótesis y no demuestra rentabilidad ni ventaja frente a todas las tiendas.

Posicionamiento propuesto: **«Tu progreso, a tu ritmo: entrenamiento y alimentación que eliges, con pasos claros y sin presión por competir».** Público inicial para validar: adultos principiantes o que retoman entrenamiento, no pacientes en rehabilitación ni menores. Accesibilidad y simplicidad también ayudan a personas mayores, sin prometer que un plan genérico es apto para cualquier condición.

## 5. Propuesta priorizada

| Entrega | Qué construir | Validación / métrica |
|---|---|---|
| P0 — confianza | Eliminación integral + web de solicitud, inventario de datos/retención, consentimientos por finalidad, revisión jurídica, menores, moderación y tiendas | Solicitud de acceso y borrado de una cuenta de prueba comprobada extremo a extremo; revisión profesional cerrada |
| P1 — primera semana clara | Un siguiente paso, planes de 15/30/45 minutos con equipo efectivo, alternativas revisadas, calentamiento y descanso; explicación «por qué este ejercicio» | Usuarios completan su primera sesión sin ayuda; tasa de abandono por pantalla, correcciones al plan y errores de cobertura |
| P1 — entrenamiento que se adapta | RPE/esfuerzo percibido opcional, pausas y sustituciones, revisión semanal sin aumentos automáticos agresivos | Adherencia D7/D30, planes editados, feedback de dificultad. No usar «sin lesiones» como métrica prometida |
| P1 — nutrición confiable | Catálogo chileno curado, porciones usuales y etiquetas, fuente y confianza visibles, favoritos y repetición de comidas | Tiempo de registro, porcentaje de estimaciones corregidas, validación de muestras por nutricionista |
| P1 — hábitos sin presión | Metas semanales flexibles, descanso reconocido, ocultar peso/calorías y rankings; retos cooperativos | Retención y bienestar reportado; no optimizar solo minutos, anuncios o número de repeticiones |
| P2 — Pro útil | Informe semanal explicable de constancia, grupos musculares y evolución, personalización real; conservar acceso al historial | Piloto de pago voluntario; conversión, cancelación y coste de servir por usuario |
| P2 — portabilidad | Exportación básica gratuita y luego importación CSV, uso sin conexión con cola idempotente | Recuperación ante mala conexión y migración de datos sin pérdida |
| P3 — profesionales | Piloto con entrenadores, credenciales y contratos, permiso granular de alumnos y revocación | Tiempo ahorrado, alumnos activos y disposición a pagar; marketplace después del piloto |

No implementar ahora un chatbot médico, dietas clínicas, detección de lesiones por cámara ni recomendaciones de suplementos. Elevan el riesgo y la exigencia de evidencia sin resolver la primera semana del usuario.

### Economía del plan

Antes de activar Pro, medir coste real por análisis, reintentos, almacenamiento, API, comisiones, impuestos y soporte. Fórmula de contribución: ingreso neto de tienda e impuestos menos esos costes variables. Simular usuarios intensivos de Pro y anuncios sin inventario; los ingresos por publicidad son inciertos. Mantener «sin cuota mensual comercial» coherente con límites técnicos de abuso transparentes, sin inventar después un límite oculto. Validar precio con entrevistas y una cohorte pequeña, no con una equivalencia automática USD/CLP.

## 6. Cambios aplicados en esta revisión

- Términos y privacidad ampliados: riesgos de salud, exactitud, menores, proveedores identificados, procesamiento internacional, datos sensibles, contenido social, suscripciones, cuotas/anuncios, derechos e incidentes. Contacto de privacidad accionable por correo. No se inventaron domicilio ni plazos operativos.
- Versión legal cliente/API: **2026-11-04**. Deben desplegarse coordinadamente: clientes anteriores rechazan una versión de servidor diferente. Preparar actualización obligatoria o compatibilidad explícita antes de desplegar solo la API; no se ha desplegado esta revisión desde este trabajo.
- Carrusel sin rotación, sombras negras ni texto amarillo fijo: tarjeta con colores del tema, texto íntegro ampliable, navegación manual, pausa, 9 segundos de lectura y sin avance automático con lector de pantalla/reducción de movimiento. La navegación manual pausa la rotación.
- Logos de interfaz con transparencia; se mantienen recursos de launcher independientes, pues quitar el fondo de la interfaz no implica que iOS/Android admitan transparencia en todos los iconos de distribución.

Pendientes de cierre: configuración legal efectiva, validación jurídica, controles operativos P0 y pruebas reales en dispositivos con texto grande, ambos temas, VoiceOver/TalkBack. No declarar «cumplimiento total» ni «todos los riesgos eliminados» por actualizar los textos.

### Verificación de esta entrega

TypeScript cliente y API aprobados. Suite API existente: 303 pruebas aprobadas; autenticación/experiencia/recordatorios: 16 aprobadas. Se añadió rechazo explícito de la aceptación legal anterior y se ejecutaron las 5 pruebas legales, todas aprobadas. `git diff --check` sin errores. Vista React Native Web con datos de prueba: navegación al segundo mensaje, texto largo completo y ambos temas comprobados; no equivale a prueba de APK instalado. Contraste calculado texto/cabecera/secundario sobre la tarjeta: mínimo 5,78:1 en claro y 6,66:1 en oscuro. Recursos de logo con canal alfa 0–255 verificado; los originales de distribución se conservan.
