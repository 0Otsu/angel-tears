# Productos: pasada final de UI/UX previa a 5.x

## Fuente, contexto y objetivo

Pedido expreso del responsable del 02/11/2026. Base comprobada con fetch, `main`/`origin/main` en `a5c6f0860e41e6e7dd4714c6e4402586c3c3ad6e`, inicialmente limpia; rama `fix/productos-ux-cierre`. Pulir la experiencia existente de [2.5](PRODUCTOS_2_5.md), [uploader](PRODUCTOS_UPLOADER_UX.md) y [galeria](PRODUCTOS_GALERIA.md), sin reabrir esas tareas ni empezar aceptacion 5.x. Se conserva el cierre tecnico [4.4](PUBLICO_4_4.md).

RF-04/05/06/07 son las referencias ya asociadas a 2.5; trazabilidad canonica SRS/RUP y CU exactos siguen pendientes segun [trazabilidad](../TRAZABILIDAD_MVP.md). Esta correccion de presentacion/coordinacion no crea RF/CU ni reglas comerciales. Fuentes: tarea autorizada, decisiones de Producto, reglas/blueprint, ADR-006/007/008 y change completo `implement-products-public-seo`.

## Inspeccion y causa del pending

Se recorrio primero el estado anterior con administradora, Next y PostgreSQL reales: listado, alta/Datos, validacion de imagen, upload Cloudinary real, Finalizar y publicacion. La carga invalida mostraba **dos dropzones**: el contenedor de cola y el FileUploader compacto, porque la validacion descartaba `archivo` y se cumplia la condicion `!compact || !archivo`.

La publicacion normal confirmo en aproximadamente 0,87 s; no se afirma haber reproducido espontaneamente un request infinito. Se reprodujo el defecto de coordinacion: despues de una mutacion real confirmada en PostgreSQL, retener exclusivamente el GET RSC de `router.refresh()` mantenia `aria-busy=true` y el texto de operacion en la fila. El mismo `useTransition` envolvia comando y refresco; el pending no representaba exclusivamente la escritura. Ademas se dibujaban boton y parrafo con el mismo estado.

Correccion: el comando tiene estado/ref de ejecucion propios, termina al recibir su respuesta y se libera en `finally`; solo una respuesta `ok` actualiza flags/version. La fila recibe tambien esa confirmacion, actualizando badges/filtros antes de que termine RSC. El refresco queda separado y la navegacion tiene su propio pending. Con el GET retenido, PostgreSQL confirmado y el mismo recorrido real, la fila queda disponible (`aria-busy=false`) y muestra exito. No se agrega timeout, progreso falso ni se oculta un request de escritura todavia pendiente. Formulario aplica la misma separacion para guardar; el alta mantiene la espera de navegacion para evitar duplicarla antes de salir.

## Estructura y comportamiento

- Listado: titulo Productos + CTA con icono `+`, 48 px de alto y pending de navegacion existente. Sin eyebrow/subtitulo editorial. Vacio con `Todavía no hay productos` y una unica accion `Crear primer producto`.
- Toolbar: busqueda con icono/placeholder, categoria y estado; labels permanecen accesibles pero visualmente ocultos. Una fila desktop, apilado mobile; no nuevos filtros.
- Filas compactas: thumbnail 56/64 px, nombre primero; precio/categoria/Publicado-Oculto/Destacado agrupados, menu contextual con target 44 px. Actualizacion propia no depende de una segunda lectura para mostrar el resultado.
- Menu Radix conservado: Editar, Gestionar imagenes, separador, Publicar/Ocultar y Destacar/Quitar destacado. Enter/flechas/Escape/foco existentes; sin borrado. Un unico indicador principal por operacion; en mobile el trigger conserva tamano de icono con texto accesible para no desbordar.
- Precio: se reutiliza `formatearPrecioPublico`, helper puro con `Intl.NumberFormat(es-AR)` y entero `BigInt`, tambien en resumen admin. `$33.000` / `$33.000,50`; no floats ni cambios en decimal persistido o validacion.
- Wizard pequeno Datos/Imagen/Finalizar: actual con aria-current, guardado con check/descripcion accesible, pasos posteriores no disponibles antes de persistir. Se mantienen vistas/borradores montados. No se agrega framework.
- Datos: campos/labels/reglas requeridas conservados, ayuda breve de precio, sin explicaciones de URL/estado interno. Cancelar secundario y guardado primario; confirmacion breve transitoria.
- Finalizar: principal pequena, nombre/categoria/precio y badges reales, acciones existentes. Sin segunda galeria ni herramienta de recarga permanente. Si hay borrador: `Tenés cambios sin guardar.` y retorno al paso pertinente; las acciones de estado esperan a que se guarde/quite esa seleccion para no confirmar datos distintos de los visibles.
- Cancelar conserva su dialogo solo cuando se perderia borrador, advertencia de salida y persistencia del Producto/C0. No elimina ni oculta una edicion publicada. Guardar como oculto confirma el comando y reutiliza la confirmacion transitoria del listado al salir.
- Se retiran footer/editorial inferior y breadcrumb repetido **solo en Productos**. Se conserva navegacion global, marca, identidad, logout y acceso publico; en subrutas el breadcrumb Productos permite volver al listado. Otros modulos conservan su presentacion.

## Imagenes y errores

Se reutilizan FileUploader/MultiFileUploader/GaleriaProducto, validacion, transporte XHR y backend actuales. La variante compacta nunca crea una dropzone propia, ni ante error de validacion. El nombre del archivo invalido permanece visible; no se ofrece reintento de contenido invalido. Una carga normalmente fallida conserva el mismo File para retry individual desde cero. Quitar pertenece a la fila; no hay dos botones de quitar ni otra zona de seleccion. La transferencia inicial se confirma una vez mediante la accion de tanda; retry queda por archivo.

Progress y processing conservan eventos XHR reales y progress nativo; no se agregan timers ni reanudacion/chunks. Se eliminan estado/ayuda repetidos, manteniendo anuncios accesibles y restricciones utiles. Principal/tipo/nombre disponibles comunican el recurso confirmado; carga/reemplazo/principal/quitar muestran una confirmacion transitoria en vez de repetir `Cargado` en cada tarjeta permanentemente. Imagen A, control de version, compensacion, serializacion y cleanup permanecen en los servicios existentes.

Errores normales cerca de la accion, con retry cuando es seguro; falta de imagen lleva a Gestionar imagenes, sesion vencida a login y conflicto real a `El producto cambió desde que lo abriste.` + `Recargar datos`. Error de lectura o confirmacion incierta conserva recuperacion explicita existente; no se habilita retry a ciegas contra una version desconocida. No SQL, HTTP codes o numeros de version en la presentacion nueva.

## Reglas y fuera de alcance

Producto/Inventario/Auth siguen como estan; oculto sin imagen permitido y publicar exige principal valida en servidor. Hasta siete medios, categorias fijas, precios mayores que cero, slug/historia y restricciones de borrado conservados. Sin schema/migration/dependencias, endpoints, adapter Cloudinary, contrato de Inventario, seed/dataset, publico/SEO o video nuevos. No se modifican servicios comerciales de otros owners.

## Criterios y verificacion

- [x] Accion principal clara, toolbar/listado/Finalizar compactos y formatter exacto compartido.
- [x] Mutacion confirmada termina sin quedar atada al refresh; error/recuperacion contextual y sin pending duplicado.
- [x] Unica dropzone principal, error/retry propios, File conservado y progreso real.
- [x] Borradores/Cancelacion/versiones y backend existentes conservados.
- [x] Responsive 320/390/768/1280/1440, controles accesibles, labels/foco/teclado/estados relevantes.

Tres nuevas pruebas de componente: recuperacion solo contextual; Finalizar con borrador conservado; formatter/actualizacion propia y aviso al filtrar una fila. Se amplian las pruebas existentes de pending unico y error invalido sin segunda dropzone. Se mantienen retry con mismo File, cola serial, object URLs, validacion cancelada, reemplazo anterior y conflictos. Los selectores afectados por copy/controles retirados se actualizan conservando aserciones SQL y de invariantes.

Tres E2E nuevos en servidor/DB aislados: vacio real/CTA/cancelar limpio; listado a cinco anchos, menu/teclado y GET RSC retenido tras mutacion real mas conflicto SQL; wizard con borrador, archivo invalido/error real de proveedor no configurado/retry y Finalizar. No se usa Cloudinary real en el arnes. Los fallos de prueba iniciales por textos retirados y selector de alerta global (que tambien alcanzaba el anunciador de rutas de Next) no se presentan como verdes: se corrigen selectores con alcance de fila y se repite la regresion, sin retirar pruebas.

Revision adicional con sesion/PostgreSQL/Cloudinary reales sobre un unico producto descartable: alta, upload, reemplazo, datos, publicacion/ocultacion y pending desacoplado comprobados. Datos comerciales anteriores y los siete fixtures no son dataset de la prueba. Capturas locales antes/despues en `work/ux-productos-cierre/`; las definitivas del arnes en `test-results/productos-ux-cierre-*` (vacio, listado, error, retry, conflicto, confirmacion durante refresh y Finalizar). Se esperan fuentes/decodificacion al revisar fotos reales; una captura previa tomada antes de cargar la imagen no se toma como evidencia de delivery roto.

Revision de build de produccion local: listado a los cinco anchos y Datos/Imagen/Finalizar a 1440/390, sin overflow. axe-core 4.14.0 ya disponible transitivamente, WCAG 2 A/AA y 2.1 AA: cero violaciones automaticas en las once vistas asentadas, con revision visual de sus capturas. Se espera el fin real de las transiciones CSS mediante Web Animations, no un delay artificial en la aplicacion. Las mediciones intermedias de color durante una transicion no se presentan como contraste final; no se afirma certificacion WCAG completa.

362 unit/component (50 archivos), 172 PostgreSQL (17 archivos) y 63 E2E completos correctos; los tres E2E de esta pasada se repiten tras acortar la ultima ayuda de retry. Lint/typecheck, build de produccion, db:check y db:generate sin cambios (12 tablas), OpenSpec strict/doctor y diff-check. Una corrida inicial sufrio salida nativa del worker Windows 3221226505, documentada en entregas anteriores; no se conto como verde ni se modifico Auth/arnes para ocultarla. Los descartables que dejaron aserciones iniciales obsoletas se retiraron exclusivamente de `_test`, con guard y comprobacion de identidad, antes de repetir toda la suite sin exclusiones.

Cleanup real: un producto y los dos identificadores de assets propios registrados retirados, comprobando ausencia de referencias antes de destroy. Los hashes por fila de **todas** las filas anteriores de Producto, Inventario y medios coinciden exactamente despues; sin revertir/borrar productos validos ni tocar los fixtures. Ledger local con `productoRetirado`, `assetsRetirados: 2` y `filasPreviasIdenticas: true`, sin valores de credenciales en evidencia. Los scripts/capturas de prueba son locales ignorados; no se instala infraestructura operativa nueva.

## Dependencias y continuidad

### Listado administrativo — pasada visual posterior

Alcance: solo listado de Productos, sin reglas nuevas ni cambios a persistencia,
Auth o implementacion de Inventario. Reutiliza la tabla UI y acciones existentes.
Filas compactas en escritorio; el mismo arbol de controles se apila como tarjetas
en movil, con encabezados de columna conservados para tecnologias asistivas.
Editar visible, resto de acciones en menu Radix, filtros combinables y limpieza de
filtros; vacio, error, carga y confirmaciones existentes conservados.

La pagina autorizada consulta una sola tanda mediante el contrato existente
`consultarDisponibilidad` de Inventario, sin SQL de stock nuevo ni saldos en el DTO
de Producto. Publicado/Oculto y disponibilidad se comunican por separado:
publicado sin stock indica `Sin stock · fuera del listado`; una lectura fallida
mantiene Productos disponibles con `Stock sin confirmar`, sin inventar saldo cero.
Es una fotografia de disponibilidad al consultar/refrescar, no un monitor en tiempo real.

Verificacion focalizada: 59 pruebas de listado/editor/preview, publicacion y pagina;
19 adicionales del adapter Cloudinary preexistente. Lint, typecheck y diff-check verdes.
Los selectores E2E de lista/fila y Editar se adaptan a tabla/accion visible, conservando
sus aserciones; no se ejecutan en esta pasada por el alcance solicitado.
Cobertura: componentes del listado/editor/preview y publicacion,
con pruebas de pagina para autorizacion antes de leer, consulta agrupada y fallo de
Inventario. Sin suite completa ni E2E costosos. La herramienta de revision visual
se detuvo por no poder verificar la URL del navegador; revision visual manual
de escritorio/movil pendiente en aquella pasada, sin afirmar capturas nuevas aprobadas.
Actualizacion 07/11: el responsable confirma responsive/listado aprobado manualmente;
la aceptacion integral y evidencia de esta ronda estan en PRODUCTOS_5_VALIDACION.md.

La auditoria de descartables de desarrollo y propuesta SQL por IDs permanecen en
`work/PLAN_LIMPIEZA_PRODUCTOS_DEMO.md` y `work/propuesta-limpieza-productos-demo.sql`,
ignorados por Git. La propuesta fue aprobada y ejecutada posteriormente para seis IDs,
con respaldo, simulacion ROLLBACK, COMMIT y comprobacion de registros ajenos intactos.
Resultado: siete productos reales; evidencia en work/limpieza-productos-demo-resultado.json.
No se tocaron assets Cloudinary ni se agrega borrado definitivo a la interfaz.

Reutiliza Auth/C0, publicacion y galeria ya integradas; no cambia arquitectura ni requiere ADR nuevo. Continuan sin marcar 5.1/5.2/5.3, integracion con dependencias reales/aceptacion global, trazabilidad academica y deployment/dominio/CWV de campo. Video sigue diferido. Esta pasada no equivale a aceptar 5.x ni certificacion WCAG completa.
