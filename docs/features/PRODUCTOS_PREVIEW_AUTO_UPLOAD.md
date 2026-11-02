# Productos: auto-upload y vista previa real

## Fuente, contexto y objetivo

Ajuste funcional/UX acotado autorizado por el responsable el 02/11/2026, continuado desde el checkpoint interrumpido. Base `1fc15ebbd10184ace38f6cb75b226eae2ea1f823`, rama `feature/productos-preview-auto-upload`. Conserva [2.5](PRODUCTOS_2_5.md), [galeria](PRODUCTOS_GALERIA.md), [pasada UX](PRODUCTOS_UX_CIERRE.md) y [cierre tecnico 4.4](PUBLICO_4_4.md); no reabre esas aceptaciones ni inicia 5.x.

RF-04/05/06/07 son las referencias previas del slice. La referencia canonica SRS/RUP y CU exactos conservan las brechas de [trazabilidad](../TRAZABILIDAD_MVP.md); no se inventan requisitos academicos nuevos. Reglas de negocio y ADR-006/007/008 vigentes, sin cambios de categorias, precio, stock o publicacion.

## Criterios y comportamiento verificados

- [x] Datos / Imagenes / Vista previa sobre el mismo Producto persistido; conservacion del borrador y control de version propio.
- [x] Seleccionar o soltar inicia validacion y cola automatica, tambien al reemplazar. Una transferencia activa, orden de seleccion conservado aunque otra validacion termine primero; agregar mientras sube deja los nuevos pendientes. Sin boton global Subir archivos.
- [x] Por archivo: Pendiente, Validando, Subiendo con porcentaje XHR real, Procesando indeterminado, Cargada confirmada o Error. Una seleccion local nunca se presenta como referencia confirmada.
- [x] Retry individual conserva el File y reenvia desde cero; no reinicia exitosos. Error invalido se quita y selecciona de nuevo. No hay resumable/chunks ni timers ficticios.
- [x] Continuar y el paso Vista previa bloqueados mientras haya pendientes/cargas/procesamiento o errores sin resolver; contador Guardando N imagenes. Los errores se reintentan o quitan antes de avanzar.
- [x] Preview autorizada de oculto con datos, principal/galeria y disponibilidad real; URL publica del oculto sigue en 404. Publicar conserva validacion de imagen en servidor.
- [x] Editar datos y Gestionar imagenes vuelven a las vistas existentes. Ver producto usa slug real y abre otra pestaña anunciada; solo se ofrece para publicado. El menu del oculto abre preview administrativa.
- [x] Guardar como oculto confirma y vuelve al listado con aviso transitorio; al salir no actualiza el snapshot padre para iniciar una lectura de preview que compita con esa navegacion. Regresion cubierta en RTL y navegador.

## Arquitectura y errores

`MultiFileUploader` / `FileUploader` siguen genericos; `autoUpload` es optativo y su modo manual anterior permanece disponible. `GaleriaProducto` adapta reglas/transporte existentes de Producto. No se duplican XHR, validadores, endpoints, adapter Cloudinary, compensacion ni CAS.

`VistaDetalleProducto` contiene la presentacion compartida del PDP (galeria, datos, precio, disponibilidad, contacto y acordeones). El wrapper publico conserva Header/Footer, regreso, relacionados, fetch, filtro publicado/404 y metadata/SEO. La preview usa esa misma pieza, con h2 y enlaces de salida en otra pestaña; su ancho responde al contenedor administrativo, no a una copia de la PDP. No incorpora SEO publico a admin, que conserva noindex.

La lectura privada exige `exigirAdministradora` antes de validar/consultar; comprueba id/version y reutiliza `leerDetalleProducto`, un SELECT con la misma proyeccion/instantanea Producto + Inventario + medios que la PDP. No escribe ni copia stock. Sin sesion no lee; stale no adopta datos/version ajenos. Error tecnico permite reconsulta, sesion solicita login y conflicto exige recarga. Un borrador local impide confirmar una preview distinta de lo visible.

## Evidencia real y limpieza

Smoke contra Next, PostgreSQL local y Cloudinary real, sin secretos en Git: producto descartable propio, siete PNG validos seleccionados juntos, siete POST automaticos sin boton Subir archivos, siete medios persistidos y version 1 a 8. Se observaron progreso XHR y processing reales mediante limitacion de red del navegador, sin demoras artificiales en la aplicacion. Precio `33000.50`, slug, estado oculto y stock cero conservados.

Preview del oculto con siete imagenes y Sin stock; GET publico 404. Publicacion desde preview confirmada, version 9; Ver producto abre otra pestaña y su detalle tiene contenido coincidente con el PDP real. Capturas locales de ambos detalles revisadas visualmente a igual ancho de contenido.

Cleanup controlado completado: solo el Producto/C0/medios descartables propios eliminados, siete assets destruidos con el adapter actual; consulta del prefijo exacto del producto confirma cero recursos restantes. Hash por registro de Producto/Inventario/medios anterior al smoke coincide despues del cleanup. No se modificaron registros comerciales ni los fixtures conservados.

## Validacion y evidencia local

RTL cubre cola automatica serial, agregar durante carga, orden de validacion, progress/processing, errores/retry/quitar y bloqueo del wizard; preview cubre DTO, controles/enlace, conflicto y respuestas tardias. PostgreSQL verifica autorizacion previa, oculto no mutado/publico no encontrado, igualdad preview/PDP con stock real y referencias/version invalidas. E2E prueba siete medios, teclado, publicar/otra pestaña/contenido, auto-upload con respuesta real retenida, retry/error y sesion vencida; conserva las pruebas previas de 2.2/2.3/2.5 y publico.

Revision de Imagenes y Vista previa a 320, 390, 768, 1280 y 1440 px: sin scroll horizontal, acciones visibles, foco/teclado y miniaturas; axe WCAG A/AA sobre main en las diez combinaciones sin infracciones detectadas. Se esperaron fuentes, imagenes y transiciones reales antes de medir. Esto no sustituye evaluacion humana ni certificacion universal de accesibilidad/CWV de campo.

Capturas y registros locales ignorados en `work/productos-preview/`: auto-upload, processing, cargadas, validacion-error, preview/PDP reales, `revision-{imagenes,preview}-{ancho}.png`, `accesibilidad.json`, `smoke-real.json` y ledger de cleanup. No contienen credenciales y no son fixtures ni fuente de datos publica. Logs de checks en `work/preview-*`.

Cierre: 368 unit/component (51 archivos), 176 PostgreSQL (18 archivos) y 66 E2E completos correctos. Lint/typecheck, build de produccion del arnes E2E, DB check, generacion DB sin cambios (12 tablas), OpenSpec strict/doctor y diff-check correctos. Nueve E2E focalizados verificaron tambien la regresion de salida al listado. Un primer intento de build fallo internamente en la resolucion Turbopack de Google Fonts; repeticion del comando normal y build final completo correctos, sin alterar fuentes/configuracion ni el arnes para evitarlo.

## Limites y pendientes

Sin nuevas dependencias, schema/migrations o cambios de Auth/Inventario/backend Cloudinary. No hay iframe/publicacion temporal, galeria duplicada, nuevos servicios, video o infraestructura de pruebas del dominio. La preview representa el detalle persistido en el contexto admin, no Header/Footer/relacionados publicos. Otra pestaña no recibe actualizaciones push; una nueva lectura obtiene estado actual. 5.x, otros owners, deploy y security pass no se iniciaron; 4.4 conserva su cierre tecnico previo y limites de medicion de campo.
