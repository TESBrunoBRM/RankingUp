# RankingUp: protección de imágenes subidas

Fecha: 4 de noviembre de 2026. Estado: propuesta; antivirus, cuarentena y nuevos proveedores NO implementados.

## Decisión recomendada

Usar una cuarentena privada y ClamAV en un worker aislado, con validación del formato real y recodificación de imágenes. MalShare puede complementar con reputación de hashes; no debe ser la puerta de aprobación. La ausencia de un hash en una colección de malware no prueba que un archivo sea seguro. Ningún motor garantiza detección total.

## Comparación

| Opción | Aporte | Límite y privacidad | Recomendación |
|---|---|---|---|
| MalShare | Consultar hashes, detalles y muestras de su colección; ofrece hashlookup | Su documentación describe acceso a un dataset, no un veredicto completo de escaneo de cada nueva imagen. No enviar fotos personales mediante upload/download_url. No asumir cuotas fijas: getlimit informa la cuota asignada. | Opcional: consultar SHA-256 en servidor para bloquear coincidencias conocidas; nunca aprobar por ausencia de coincidencias. |
| ClamAV autohospedado | Motor antivirus, daemon y actualización de firmas bajo control de RankingUp | Requiere recursos, mantenimiento, actualización de firmas y aislamiento. No detecta todas las amenazas ni sustituye controles de autorización o validación. Revisar obligaciones GPLv2 según la distribución elegida. | Primera opción para preservar fotos dentro de infraestructura controlada. Dimensionar memoria/CPU con pruebas antes de elegir plan. |
| VirusTotal estándar | Reputación y análisis con un ecosistema de proveedores | Las cargas estándar participan en su corpus y se comparten con la comunidad/proveedores según sus condiciones. Fotografías corporales, de comida o capturas pueden contener datos personales. | No usar para subir fotos privadas de usuarios. |
| VirusTotal Private Scanning | Análisis privado con retención limitada y acceso de la organización | Requiere producto/licencia apropiados. Su documentación aclara que NO incluye veredictos de los socios multiantivirus. Deben revisarse contrato, tratamiento de datos y región. | Alternativa comercial a evaluar; no asumir que equivale al escaneo multiantivirus estándar. |

## Flujo propuesto

1. El usuario autenticado solicita una carga: la API autoriza propietario, finalidad, frecuencia y tamaño. Genera una ruta aleatoria y un identificador inmutable. No aceptar rutas o URLs arbitrarias del cliente.
2. Carga a almacenamiento privado de cuarentena. Ninguna URL de lectura debe poder emitirse para usuarios, moderadores ni sistemas de IA en este estado. Un bucket privado por sí solo no equivale a escaneo.
3. Al finalizar, la API verifica existencia, propietario, tamaño real y versión del objeto y encola un trabajo idempotente. El worker calcula SHA-256 de los mismos bytes que analizará. Proteger contra sustitución del objeto después del análisis.
4. Validar firma real, extensión y MIME conjuntamente. Allowlist inicial propuesta: JPEG y PNG; WEBP/HEIC solo tras probar un decodificador actualizado. Rechazar SVG, ejecutables, PDF, archivos comprimidos y formatos no necesarios. No confiar en MIME declarado ni extensión.
5. Analizar con ClamAV actualizado. Configurar límites de tiempo, bytes, descompresión y recursión. Un límite alcanzado, error del motor o firmas demasiado antiguas produce error de análisis, nunca aprobación automática.
6. Decodificar y recodificar en proceso aislado, sin red y con límites de CPU, RAM, píxeles y número de cuadros; eliminar EXIF y ubicación. No procesar el original en el proceso de la API. La recodificación es defensa adicional, no garantía de eliminar malware.
7. Publicar únicamente el derivado aprobado en una ruta nueva e inmutable, asociada a su hash. Para fotos personales, mantener acceso privado con URLs firmadas de corta duración. Revalidar pertenencia y estado en cada endpoint que emita una URL o envíe una imagen a IA.
8. Mostrar «Revisando imagen», «Imagen disponible», «Archivo rechazado» o «No pudimos revisarlo; reintenta». No descontar un uso de IA por una imagen rechazada antes del análisis de comida. Separar clasificación de contenido inapropiado de detección de malware.

Estados: `pending_upload → quarantined → scanning → approved | rejected | error`. Solo `approved` puede servirse o analizarse mediante IA. Trabajos repetidos y reintentos no pueden aprobar un objeto distinto ni duplicar cargos.

## Aplicación al proyecto

Revisar los flujos de evidencias de alimentos (`food-evidence`), fotografías de progreso (`progress-photos`) y evidencias de errores (`bug-evidence`). Antes de implementar, inventariar todas las cargas, lecturas, URLs firmadas, vistas administrativas y envíos a proveedores de IA: ningún camino debe saltarse la aprobación.

Los GIF del catálogo son contenido de proveedores, con un proceso de admisión diferente: validar tipo, tamaño, integridad, derechos de uso y disponibilidad antes de alojarlos. No permitir que un usuario introduzca una URL remota que el servidor descargue sin controles contra SSRF.

No instalar ClamAV dentro del APK ni exponer claves de escaneo al cliente. Usar worker privado con credenciales mínimas y comunicación autenticada; evitar un puerto clamd público. Los logs registran identificadores, estado, hash y versión del motor, sin fotos, URLs firmadas, tokens ni información de salud.

## Operación y criterios de aceptación

- Definir antes de producción: máximo de bytes y píxeles por finalidad, plazo de cuarentena, retención de rechazados, cuotas por usuario y plazo de reintento. Son decisiones pendientes, no capacidades disponibles hoy.
- Eliminar temporales y originales según una política documentada; la eliminación de cuenta debe abarcar cuarentena, derivados, trabajos y referencias. Evitar que copias de respaldo prometan borrado instantáneo.
- Supervisar antigüedad de firmas, cola, latencia, errores, espacio y costes. Si el escáner no está disponible, conservar en cuarentena y reintentar con límite; no liberar automáticamente.
- Pruebas: JPEG/PNG válidos, extensión falsa, MIME falso, SVG y formatos prohibidos, imagen truncada, exceso de dimensiones, archivo sobredimensionado, bomba de descompresión, timeout, firmas vencidas, falso positivo, doble trabajo, sustitución posterior al escaneo y acceso de otra cuenta.
- Usar EICAR exclusivamente como fixture aislado de pruebas de detección; no descargar malware real ni colocarlo en producción.
- Verificar que moderación, perfiles, IA y enlaces firmados no muestran originales pendientes/rechazados y que el cliente no puede marcar un archivo como aprobado.
- Evaluar contratos y política de privacidad antes de transferir cualquier archivo o dato a terceros. La seguridad contra malware no autoriza por sí sola tratamientos adicionales de fotos personales.

## Fuentes primarias

- [MalShare: documentación de API](https://malshare.com/doc.php): endpoints y alcance del dataset.
- [ClamAV: documentación oficial](https://docs.clamav.net/): motor, daemon y actualización de firmas.
- [VirusTotal: funcionamiento del servicio estándar](https://docs.virustotal.com/docs/how-it-works): corpus y compartición.
- [VirusTotal Private Scanning](https://docs.virustotal.com/docs/private-scanning): privacidad, retención y ausencia de veredictos multiantivirus.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): validación, límites, almacenamiento aislado y antivirus.

Los detalles de proveedor y condiciones deberán verificarse de nuevo al contratar. Este documento define una integración futura; esta entrega no activa un escáner ni afirma que las imágenes actuales estén libres de malware.
