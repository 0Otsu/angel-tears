# Polish UX posterior a Producto 2.5

## Fuentes, objetivo y alcance

Pedido expreso del responsable del 01/11/2026, posterior al cierre funcional de [Producto 2.5](PRODUCTOS_2_5.md). Base remota verificada `0ca9698081ece0cac303b461b1d8639ff6af4bc1`; rama `fix/productos-uploader-ux`. Mejora feedback de imagen y salida del editor, preservando las reglas aceptadas de 2.1-2.5. RF-04/05/06/07 ya asociados en esa evidencia; CU exactos pendientes de formalizacion RUP, sin crear identificadores ni requisitos comerciales nuevos.

La referencia de drag & drop es conceptual: borde, superficie, copy, progreso honesto, retry y preview. Se conservan crema/verde, tipografia, radios y sombras actuales. Una sola imagen principal, sin cola, galeria, carga automatica, chunked/resumable ni nuevas dependencias/tablas/migrations. Backend Cloudinary, Handler, Sharp, CAS/compensacion, Auth e Inventario permanecen sin cambios.

## Arquitectura y reglas conservadas

- `components/ui/file-uploader.tsx`: UI reutilizable de una seleccion, reducer con ocho fases, object URLs, drag/teclado, tarjeta de archivo y progreso. Recibe `accept`, limite de bytes, validacion asincronica, `upload(file, eventos, signal)`, callbacks, textos y preview vigente. No conoce Producto, Angel Tears, Cloudinary ni endpoints. El callback de upload solo debe resolver con exito despues de confirmar la persistencia; el componente no infiere confirmacion a partir del 100% transferido.
- `components/admin/carga-imagen-producto.tsx`: wrapper de Producto. Adapta JPEG/PNG/WebP, 3 MiB/20 MP, version y primera carga/reemplazo a `enviarImagenProducto` existente. La ayuda de validacion del navegador se extrae a `imagen-validacion-cliente.ts`, sin duplicar el decoder/validacion definitiva del servidor.
- La consulta administrativa expone opcionalmente el formato de la columna ya existente `imagen_formato`, solo para mostrar el tipo verdadero al recargar. No cambia `ProductoInterno` ni contratos compartidos con otros owners. No se inventan nombre/tamano del archivo original si ya no estan disponibles.
- `CancelarProducto` concentra salida, aviso de borrador y confirmacion accesible. Formulario/editor reportan cambios locales; guardar los datos propios actualiza su referencia de comparacion. Cambiar entre Datos/Imagen/Finalizar conserva las vistas montadas y el borrador existente.

## Estados e interaccion

| Fase | Senal verificable |
| --- | --- |
| idle | Arrastra una imagen / o elegila desde tu dispositivo; seleccion explicita por boton, click o teclado |
| drag-over | Borde oliva de mayor contraste, superficie y halo sutiles, `Soltá para cargar`; nombre/tamano solo cuando DataTransfer los permite |
| selected | Miniatura local, nombre, MIME y tamano; cambiar/quitar antes del envio, sin subir automaticamente |
| validating | Validacion asincronica del archivo; nunca presenta la seleccion como persistida |
| uploading | Nombre conservado, porcentaje y progress nativos desde eventos XHR reales; indeterminado si no hay total calculable |
| processing | `Procesando imagen…`, progreso indeterminado tras upload.onload, sin 99% ficticio ni timers |
| success | Preview remoto confirmado, `Imagen cargada`, metadata disponible y Cambiar imagen; version propia actualizada |
| error | Mensaje textual inline, seleccion conservada para retry cuando es seguro y Elegir otra imagen |

El arrastre usa contador de entradas/salidas para no perder feedback al pasar entre hijos; vuelve al estado anterior al salir. Multiples archivos se rechazan, sin crear una cola. Las transiciones son cortas y respetan `prefers-reduced-motion`. Dropzone enfocada y operable con Enter/espacio, input file real, instrucciones asociadas, `aria-live`, errores textuales y progreso con semantica nativa. URLs locales se liberan al quitar/cambiar/confirmar/desmontar; respuestas tardias de validacion/transferencia no confirman una vista abandonada.

Durante reemplazo, A sigue como imagen vigente y B aparece identificada como seleccion local sin guardar. Solo una respuesta de exito validada del Handler cambia la tarjeta vigente a B. Ante fallo, A permanece y B se conserva para reintentar si corresponde. No se modifican compensacion, concurrencia ni limpieza de 2.3. Se preservan los avisos de limpieza pendiente y recarga obligatoria ante sesion/conflicto o persistencia incierta.

**Reintentar conserva el mismo File en memoria, pero vuelve a enviar todo desde el inicio. No reanuda una transferencia ni persiste el File al recargar/cerrar la vista.** No hay velocidad ni tiempo restante estimados. Un fallo de red/respuesta ambigua conserva el comportamiento seguro existente de recargar antes de otra escritura; errores normales confirmados del proveedor/configuracion permiten retry inline.

## Cancelar y finalizar

- Alta/Datos: Cancelar + Guardar y continuar. Antes de persistir, cancelar navega al listado sin comando de negocio. Con datos locales, se confirma si salir sin guardar o seguir editando.
- Imagen: Cancelar + Continuar al resumen. Si hay seleccion local sin subir, se advierte antes de abandonar; navegar a Finalizar conserva el borrador y explica que el resumen muestra el ultimo estado guardado.
- Finalizar oculto: Cancelar + Guardar como oculto + Publicar producto. Se conserva la validacion definitiva existente de imagen requerida para publicar. El mensaje de publicacion permanece visible al pasar al menu de acciones del producto publicado, sin desmontar ese componente.
- Despues de crear el Producto oculto, Cancelar nunca lo borra ni agrega un nuevo estado de dominio. El listado consulta el registro autorizado y muestra `El producto quedó guardado como oculto.`. En edicion publicada conserva publicado/flags/version y comunica `El producto conserva su último estado guardado.`; no lo oculta para satisfacer el mensaje.
- Accion secundaria con borde/texto de peligro suave, sin relleno rojo. Cancelar y navegacion entre secciones se bloquean mientras hay una operacion propia en curso. Dialog con Escape y retorno de foco, mas advertencia nativa de salida de documento si hay borrador. No se agrega un interceptor global del router/admin.

## Criterios de aceptacion y evidencia

- [x] Ocho fases explicitas; borde/superficie/copy de arrastre; seleccion manual y drop por el mismo camino; validacion sin upload automatico.
- [x] Preview local y vigente distinguidos, progreso real/processing indeterminado, retry con el mismo File, elegir otro/quitar y liberacion de object URLs.
- [x] Exito confirma URL remota; reemplazo exitoso actualiza version, fallido conserva A; sesion/conflicto mantienen la proteccion existente.
- [x] Cancelar antes de persistir no crea filas; despues conserva Producto/C0; cancelar edicion publicada conserva visibilidad/version. Confirmacion accesible para cambios locales.
- [x] Desktop/notebook/mobile, teclado, foco, labels/alt/aria-live, acciones envueltas sin overflow horizontal. La tarjeta confirmada coloca Cambiar imagen en una fila completa en mobile para evitar solapamiento con tipo/nombre.
- [x] Regresiones existentes de 2.2/2.3/2.5 conservadas, publico/SEO verde y datos comerciales previos intactos.

337 unitarias/componentes (ocho del uploader generico, cuatro de Cancelar y una regresion adicional de feedback al publicar), 161 PostgreSQL y 22 E2E relevantes correctos: seis de administracion/Cancelar, cuatro de imagen/reemplazo y doce de publico/SEO. Los tests existentes mantienen sus aserciones; solo se actualizan los selectores/copy afectados por la nueva UI. Error/retry se comprueba en navegador con el fallo real de configuracion del servidor aislado de E2E, conservando A, File y SQL sin cambios. PostgreSQL usa exclusivamente la base `_test` validada por el guard del proyecto.

Smoke adicional con UI/administradora/PostgreSQL/Cloudinary reales en desarrollo: crear descartable oculto+C0, primera carga A por POST, publicar/destacar, rechazo de segundo POST y PUT stale sin crear assets nuevos, seleccionar/quitar B sin modificar A, reemplazar por B mediante PUT, version 4 a 5, datos/slug/precio/flags/stock conservados; Admin API confirma A retirada y B unica, delivery HTTPS 200/bytes originales. Borrador material preservado y guardado posterior con version nueva, PDP/OG usan B y ocultacion devuelve 404. Producto, saldo y assets descartables limpiados con verificacion de que todas las filas comerciales previas coinciden; los siete fixtures permanecen intactos. Sin secretos en evidencia.

Capturas locales conservadas bajo `work/` (ignorado por Git):

- `uploader-polish-{vacio,listado,nuevo,editar}-{desktop,mobile}.png`: rutas reales y acciones.
- `uploader-polish-{selected,uploading,processing,success}-real.png`: primera carga real desktop; barra desde XHR, sin falsificar progreso.
- `uploader-polish-{selected,uploading,processing,success}-mobile-real.png`: los mismos estados con transferencia real en mobile.
- `uploader-polish-capturas/uploader-{idle,drag,selected}-{desktop,notebook,mobile}.png`, `reemplazo-{desktop,notebook,mobile}.png` y `cancelar-{desktop,mobile}.png`: drag, preview, error/retry y Cancelar de E2E.
- `uploader-polish-smoke-evidencia.json`: etapas/cleanup sin valores Cloudinary ni URLs con identificadores de cuenta; script local `smoke-uploader-polish.ts`. La limitacion de red se aplica solo desde el navegador de prueba para observar eventos reales, nunca desde codigo de la aplicacion.

Lint/typecheck, build de produccion del arnes E2E, db:check y db:generate (11 tablas, sin cambios), OpenSpec strict/doctor y git diff --check correctos. Typecheck detecto una opcion invalida del selector nuevo de test; se retiro sin debilitar su asercion y la corrida final paso. La revision visual encontro y corrigio el solapamiento mobile y la perdida del feedback de publicacion por remount. Sin cambios a configuracion ni dependencias para ocultar advertencias existentes de las herramientas.

## Limites y continuidad

2.5 permanece aceptada; esta evidencia no reabre tasks ni cierra capacidades adicionales. 4.4 sigue parcial: imagen responsive/entrega optimizada y medicion productiva pendientes. 5.x sigue abierta. Se conservan los limites distribuidos/conciliacion operativa de [2.3](PRODUCTOS_2_3.md), los datos comerciales/dominio pendientes y la regresion historica de importes cuando Compras/Ventas esten persistidas. Esta pasada no equivale a certificacion WCAG completa ni implementa navegacion protegida universal fuera de las acciones del editor.
