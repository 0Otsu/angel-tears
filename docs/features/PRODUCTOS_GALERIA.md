# Galeria de Producto: ampliacion autorizada

## Fuente, contexto y alcance

Pedido expreso del responsable del 01/11/2026: evolucionar la unica imagen de 2.2/2.3 a una galeria pequena. Base verificada `5ef2da9b6772d0914dbc4549c39d5ef731033886`, rama `feature/productos-galeria`. Sustituye L2 en decisiones; no reabre las tareas aceptadas 2.2-2.5 ni cambia stock, dinero, categorias, Auth o historicos. Asociado a los requisitos de Producto/publico ya referenciados en esas features; alineacion SRS/RUP y CU exactos pendientes, sin inventar identificadores. OpenSpec registra la ampliacion en G1, sin cerrar 4.4/5.x.

P0: hasta siete imagenes JPEG/PNG/WebP, principal explicita, seleccion multiple, estados independientes, retry, reemplazo/eliminacion seguros y galeria PDP. P1 video queda **pendiente**, sin aceptarlo en input/servidor ni copiar una invitacion a subir videos que no funcionan.

## Modelo y migration

Una sola migration nueva `0003_producto-galeria.sql`, journal/snapshot generados con Drizzle y SQL de backfill/consistencia revisado. Fetch e historia de ramas remotas no mostraron otra migration nueva al iniciar; antes del merge se vuelve a comprobar. Nunca se editan 0000-0002. Schema propio `producto-media.ts`, sin alterar los de otros owners ni package/lock/arnes.

`producto_media`: UUID propio, FK Producto, tipo, posicion (1..7), principal, asset/public ID, version del proveedor, URL HTTPS, ancho/alto/formato. Sin binarios ni siete columnas fijas/arrays JSON como persistencia. El JSON de proyeccion publica es resultado de una consulta, no el modelo almacenado. Tipo actualmente restringido a imagen: preparar el campo no habilita video sin decoder/politica/migration posterior.

- Posicion unica por producto entre 1 y 7 impide mas de siete filas incluso en SQL concurrente. Posiciones estables, se reutiliza el primer hueco disponible; reemplazar conserva ID/posicion. Sin ordenar por drag ni sortable.
- Indice parcial unico de principal por producto; constraint de tipo/contenido de referencia/dimensiones. Public ID indexado pero **no** globalmente unico: preservar imagenes previas compartidas y comprobar todas las referencias antes de destroy.
- Backfill copia cada referencia anterior como imagen principal en posicion 1, con UUID de medio nuevo; conserva asset/public IDs, URL y version del proveedor, sin llamadas Cloudinary. Producto/Inventario permanecen iguales, incluidos fechas/version/flags/slug/precio/saldo.
- Las columnas previas de imagen son una **proyeccion de principal compatible**. Trigger sincroniza escrituras de endpoints historicos hacia la fila principal; constraints diferidos verifican coincidencia de los siete campos y que publicado tenga principal. No se sostienen dos fuentes independientes solo por convencion de UI. Cambiar galeria y proyeccion ocurre en la misma transaccion. Una futura retirada de columnas requiere migrar consumidores/otra migration, fuera de esta entrega.
- FK cascade permite retirar datos sinteticos de pruebas junto al producto; no incorpora un comando de borrado comercial de Producto.

Verificacion real de SQL versionada en `galeria-migracion.integracion.test.ts`: namespaces aislados en la BD `_test`, aplica 0000-0003 desde cero y aplica 0003 sobre datos creados con 0000-0002; compara filas comerciales completas y referencias backfilled. ROLLBACK retira ambos namespaces. Comprobacion adicional local con BD efimera `_test` y migrador Drizzle, retirada al terminar. Desarrollo se migro comparando hashes de todas las filas Producto/Inventario antes/despues: coinciden. Sin reinicializar volumen ni sembrar productos.

## Backend e integridad

Handlers `/api/admin/productos/[id]/medios` GET/POST y `.../[medioId]` PUT/PATCH/DELETE. Consulta privada exige Auth antes de leer; mutaciones verifican sesion/origen y referencias. Upload reutiliza el lector multipart acotado y la validacion Sharp de 2.2: JPEG/PNG/WebP reales, 3 MiB/20 MP. Nombres/MIME/extensiones no autorizan contenido. Cloudinary continua en servidor con IDs nuevos sin sobrescritura; secretos nunca pasan al browser.

Lock de Producto y control de version serializan cambios de medios con edicion/publicacion. Agregar/reemplazar: validar bytes, subir recurso nuevo, confirmar la transaccion y despues limpiar el anterior si ya no esta referenciado ni por galeria ni por columnas previas. Compensar solo el recurso nuevo perdedor/fallido. Ante COMMIT ambiguo se consulta la referencia antes de compensar; si la lectura falla no se destruye a ciegas. Una version ajena posterior requiere recarga, sin adoptar silenciosamente esa version sobre un borrador comercial antiguo.

Quitar principal promueve el siguiente medio disponible; quitar la ultima de un producto publicado se rechaza sin efectos. Ocultarlo primero permite galeria vacia y conserva Producto/C0. Cambiar principal actualiza proyeccion/SEO sin eliminar recursos. Publicacion conserva su servicio existente y constraint transaccional de principal valida. Endpoints 2.2/2.3 mantienen primera imagen/reemplazo de principal y sincronizan la relacion; su cleanup tambien consulta medios secundarios antes de eliminar.

Si destroy falla postcommit: respuesta exitosa con limpieza pendiente y aviso de conciliacion; no se revierte ni se elimina el ganador. Si una mutacion sin binario pierde el acuse, se conserva error de confirmacion y se requiere recarga; no se ejecuta cleanup a ciegas. Un crash distribuido puede dejar un recurso huerfano: sigue pendiente conciliacion operativa por prefijo/antiguedad/referencias, sin prometer transaccion distribuida ni agregar worker artificial.

## Uploader y UX

`MultiFileUploader` coordina una coleccion con identidades UUID sobre **el mismo FileUploader** de la pasada anterior, con archivo inicial/modo compacto/autoenvio por props. Validacion, preview, object URL, estados, progreso, processing y retry por archivo se reutilizan. No conoce Producto ni Cloudinary. Transporte XHR extraido a `lib/upload-xhr.ts`, compartido por cliente historico y galeria. Wrapper `GaleriaProducto` adapta limites, GET/POST/PUT/PATCH/DELETE y version; los componentes genericos reciben callbacks.

- Zona completa clickeable, Enter/espacio, input multiple real, drag con borde/fondo/copy, focus visible, aria-live y texto. No boton Seleccionar redundante en la zona inicial. Copy honesto: imagenes, hasta siete; agregar mas mientras quede cupo.
- Politica de cupo: rechazar **toda** nueva seleccion si guardados + seleccionados + nuevos supera siete; se conservan los anteriores y se explica el rechazo. El backend/SQL hacen cumplir el mismo maximo.
- Cada archivo conserva selected/validating/uploading/processing/success/error/retrying y preview/nombre/tipo/tamano. Progreso solo por eventos XHR, indeterminado durante procesamiento o si no hay total calculable, sin timers/ETA ficticios. El File se conserva para retry de ese archivo desde cero; sin chunked/resumable. Al confirmar aparece en la galeria persistida con Cargado y metadata disponible; al recargar no se inventa nombre/tamano originales.
- **Concurrencia elegida: una transferencia activa.** Preserva version CAS del producto y evita que las cargas propias de una misma seleccion compitan entre si. Los restantes siguen seleccionados y entran al terminar el activo; errores normales no bloquean la cola y los exitosos no se reenvian. Conflicto/sesion/confirmacion incierta bloquean escrituras hasta recarga segura. No se finge simultaneidad de porcentajes: cada barra pertenece a su transferencia real.
- Reemplazo conserva A en la tarjeta vigente mientras B es local/sube. Solo confirmacion PostgreSQL cambia la tarjeta. Gestion de principal/quitar/reemplazar con feedback existente y sin bloquear modulos ajenos. Navegacion del editor deshabilitada durante cargas; Cancelar conserva productos y advierte de selecciones locales como antes.
- Object URLs y AbortController se limpian al quitar/cambiar/confirmar/desmontar; validacion/respuesta tardia no confirma una vista abandonada. Transiciones cortas y movimiento reducido conservados.

## Publico y SEO

PDP usa una galeria simple con imagen inicial principal, thumbnails/botones con nombres, aria-pressed y teclado; mobile sin carrusel/dependencia nueva. Consulta correlacionada agregada **en el mismo SELECT** que principal/visibilidad/stock, sin N+1 ni mezclar versiones entre dos lecturas. DTO de galeria contiene solo URL/dimensiones/alt, sin IDs del proveedor/version/saldo. Catalogo/Home/relacionados, OG, metadata y JSON-LD siguen usando solamente la proyeccion principal. Reglas agotado/oculto y cache por solicitud/postcommit conservadas; sin VideoObject inventado.

## Aceptacion y pruebas

- [x] Relacion explicita, backfill sin recrear assets, compatibilidad historica y maximo siete en servidor/SQL.
- [x] Varias selecciones visibles; error/retry aislado y cola serial con progreso honesto; preview local/persistido y metadata disponible.
- [x] Principal unica, cambio de principal, reemplazo, eliminacion, ultima publicada protegida y oculto vacio.
- [x] PDP/teclado/mobile, principal en cards/SEO y ausencia de privados en DTO.
- [x] Smoke Cloudinary real completo y cleanup, checks finales y evidencia antes de integrar.

348 unit/component y 172 PostgreSQL correctos: pruebas nuevas de galeria/reconstruccion/backfill, maximo siete, limites/invalidos, permisos/origen, publicacion, concurrencia, rollback/compensacion, cleanup fallido y endpoints historicos. Pruebas genericas de seleccion multiple, progreso/processing, fallo aislado/retry del mismo File, cupo, drag/teclado, quitar invalido y object URLs; prueba del selector publico. Se conservan las aserciones de 2.2/2.3/2.5; selectores adaptados a la nueva galeria y copy de retry.

E2E: diez administrativos existentes y doce publico/SEO, mas tres de galeria (desktop/mobile/guard), correctos en corridas especificas. Nuevos recorridos prueban dos seleccionados, rechazo de excedente, dos errores independientes de configuracion real del servidor aislado, retry individual, cambio de principal, PDP/OG, eliminacion con cleanup pendiente y rechazo de ultima publicada. Servicio remoto deshabilitado en E2E; esto no sustituye el smoke real. La regresion completa del proyecto pasa: 57 E2E, incluyendo Auth/Cuenta/recovery y todos los recorridos de Producto/publico.

Capturas locales en `work/galeria-capturas/` y `work/galeria-*-real.png`: vacia/drag/seleccion/transferencia/procesamiento/exito/admin/PDP desktop/mobile; revisadas durante el cierre. No equivalen a certificacion WCAG ni cierre de rendimiento.

## Smoke Cloudinary real y cierre del 02/11/2026

Tres variables detectadas sin imprimir valores. Smoke sobre Next build/start local y exclusivamente `angel_tears_dev`; no es un despliegue productivo. Producto UUID descartable con alta real/C0 y ajuste INICIAL de tres unidades mediante el servicio existente de Inventario, solo para hacerlo elegible en cards; no se cambia codigo de Inventario ni datos anteriores. Dos imagenes distintas seleccionadas juntas permanecen visibles y se cargan en serie con XHR real, procesado/guardado independientes, SQL version 3 y delivery HTTPS con bytes originales.

Cambio de principal a B, publicacion y destacado reales: PDP/selector por teclado, Home/catalogo y OG usan B. Reemplazo B a C confirma SQL antes de destroy B; C entregable. Eliminar secundaria retira su asset; quitar ultima publicada se rechaza. Se agregan seis PNG pequenos validos hasta siete assets reales; el octavo se rechaza en UI/API con el mismo recuento remoto y sin cambiar version. Ocultar permite retirar los siete, con destroy confirmado y Producto/C0 conservados hasta cleanup del descarte. El script retira solo su producto, movimientos/ajuste/saldo y assets; hashes de todas las filas previas Producto/Inventario/medios/ajustes/movimientos coinciden despues. Evidencia local `work/galeria-smoke-evidencia.json`, `smoke: correcto`, `cleanup: true`; no guarda secretos ni URLs del proveedor.

La revision real encontro un fallo de FileList vivo: limpiar el input podia vaciarlo antes de que React ejecutara el updater. Se captura la lista/identidades antes de limpiar, con regresion bajo StrictMode y drag. Otra prueba verifica que una tanda posterior espere confirmacion y que elegir otro archivo reporte el File efectivamente enviado. Barras con transicion CSS de 150 ms y movimiento reducido, sin adelantar porcentaje. Capturas de seleccion/processing/exito muestran ambos archivos y la galeria confirmada en mobile; error/retry/cupo/PDP tambien verificados con el arnes aislado. Los primeros intentos de inspeccion local no se presentan como smoke exitoso; sus descartables se limpiaron.

Lint/typecheck/build, db:check, db:generate sin cambios (12 tablas), OpenSpec strict/doctor y diff-check correctos. Una sola migration nueva y las tres anteriores intactas. Una corrida SQL se interrumpio por salida nativa del worker Windows (3221226505) en aprovisionamiento Auth no modificado; no se conto como verde. La repeticion completa paso 17 archivos/172 tests, sin excluir pruebas ni cambiar Auth/arnes. No se reabre 2.2-2.5; G1 completa con evidencia. 4.4 parcial y 5.x abiertas.

## Video: motivo concreto y continuidad

No implementado. Sharp verifica imagenes; adapter usa resource_type=image y valida respuesta image. No hay ffprobe/decoder de video disponible, ni limites aceptados de duracion/tamano/contenedor ni hosting definido para cuerpos mayores. Aceptar MP4 por MIME o firma aislada, o mandarlo al proveedor sin validacion suficiente, no seria una implementacion completa. Agregar video correctamente requiere decidir limites compatibles con hosting, un validador de contenedor/duracion, respuesta/delivery de recurso video y sus tests. No se agrega dependencia/servicio pesado ni pipeline propio para cerrar artificialmente P1 esta semana. El modelo tiene tipo y las UIs reciben comportamiento, pero el constraint/input/backend no permiten video hasta esa implementacion.

4.4 continua parcial (entrega responsive optimizada/medicion productiva) y 5.x pendiente. Galeria no cambia historicos economicos ni resuelve la aceptacion futura de Compras/Ventas. No hay nuevos seeds automaticos, cambios a los siete fixtures ni implementaciones en modulos ajenos.
