# Producto 2.2: primera carga de imagen principal

## RF relacionado

RF-04 Registrar producto y RF-06 Modificar producto de la [SRS vigente aportada por el responsable](https://docs.google.com/document/d/1SugCvtS4De8LImkAEiis5pGWY8Eg99TgWIXzBWMS72w/edit). Una imagen principal, opcional en oculto y necesaria posteriormente al publicar. Esta entrega no implementa ni declara cubiertas publicación o reemplazo. Fuentes técnicas: [ADR-007](../adr/ADR-007-cloudinary-imagenes.md), [blueprint](../BLUEPRINT_IMPLEMENTACION_MVP.md), [seguridad](../SEGURIDAD.md) y change `implement-products-public-seo`.

## CU relacionado

Identificadores exactos pendientes de formalización con RUP; no se inventan CU. La tarea expresa del responsable autoriza únicamente la primera carga a un Producto persistido.

## Objetivo

Adjuntar una única imagen principal desde el admin mediante un Handler autenticado, validación real, adaptador Cloudinary y persistencia en las columnas de Producto existentes.

## Contexto y dependencias

Trabajo del 28/10/2026 desde main/origin en `86cf98d29e395c9b4a0d5abddc2e759c3245d6ed`, limpios y sin avances tras fetch; rama `feature/productos-2-2-imagen`. Producto 2.1, Auth y C0 persistentes se reutilizan. Al iniciar este slice, 1.1 estaba pendiente únicamente de Emi y el responsable confirmó que no lo bloqueaba. El 29/10/2026 se cerró 1.1 con las confirmaciones humanas de Claudio sobre DTO/semántica y de Emiliano sobre la frontera Auth, registradas en [OpenSpec](../../openspec/changes/implement-products-public-seo/tasks.md). No se modifican Auth, Inventario, DTO compartido, schema ni migraciones.

- **Sharp 0.34.5:** se reutiliza exactamente la versión que ya trae Next y se declara directa para que el decoder del módulo no dependa accidentalmente de una dependencia transitiva. Proporciona metadata y decodificación completa; comprobaciones manuales de extensión/MIME no cubren esa garantía. No se actualiza Sharp de Next ni se instala otra versión nativa.
- **Cloudinary 2.11.0:** SDK oficial estable compatible con Node 24 del proyecto para upload autenticado y eliminación. El SDK queda exclusivamente en el adaptador servidor; usar HTTP firmado propio duplicaría la firma/protocolo del proveedor. No se agregan parsers multipart, widgets ni otros paquetes auxiliares.
- Tres variables solo servidor en `.env.example`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. No se alteró `.env.local`, no se versionan credenciales ni se crean cuentas/servicios.

## Reglas de negocio y validación

- Producto debe existir; el alta oculta sigue funcionando sin imagen y con C0 cero.
- Solo primera imagen. Si ya existe, respuesta 409 `imagen_existente`, sin upload ni sobrescritura. No hay galería, borrado físico, publicación ni acciones de reemplazo.
- JPEG, PNG y WebP reales; máximo 3 MiB (3.145.728 bytes) y 20.000.000 píxeles. Firma binaria limita formatos antes del decoder. Sharp lee metadata y `stats()` fuerza la decodificación completa con `failOn: warning`; se rechazan también imágenes truncadas. En archivos con múltiples frames se limita el total de píxeles y se decodifican todos, sin convertir el archivo.
- Se suben exactamente los bytes recibidos: no resize, cambio de formato ni transformación silenciosa. Nombre/extensión/MIME del navegador no determinan el tipo autorizado.
- Se actualizan únicamente referencia/dimensiones/formato de imagen, versión y fecha de actualización. Slug, datos comerciales, flags y saldo no cambian.

## Arquitectura y frontera

`POST /api/admin/productos/[id]/imagen`, runtime Node. Handler fino compuesto con el guard `exigirAdministradora` real y el servicio de Productos; no modifica Better Auth ni crea sesiones paralelas.

Se exige sesión antes de consumir el cuerpo y `Origin` exacto de `BETTER_AUTH_URL` (no se confía en Host/forwarded headers). Se valida UUID, multipart con un solo archivo y una versión esperada, sin otros campos. Tope global 3 MiB + 64 KiB de envoltorio, control de Content-Length y conteo efectivo del stream incluso si miente o falta. Solo después de acotar bytes se parsea con `Response.formData()` de la plataforma. El servicio vuelve a exigir sesión junto a la mutación; una página protegida no sustituye el guard del comando.

El adaptador expone `almacenarImagen`/`eliminarImagen` con referencia propia, sin tipos SDK en el resto del dominio. Usa `upload_stream` autenticado, id UUID generado en servidor bajo `angel-tears/{desarrollo|produccion}/productos/{id}/`, sin overwrite. Valida public_id esperado, asset_id, versión, formato, bytes, dimensiones y URL HTTPS del cloud configurado. Normaliza el formato `jpg` del proveedor a `jpeg` del contrato, sin modificar bytes ([referencia de Upload API](https://cloudinary.com/documentation/image_upload_api_reference)). Nunca acepta una URL remota del cliente ni usa preset unsigned. No hay binarios en PostgreSQL ni uploads dentro de `public/`.

Una transacción corta ejecuta UPDATE condicionado por id, versión esperada e imagen todavía null; no mantiene locks durante upload. Tras commit se confirma éxito y se revalida `/admin/productos`. Respuestas `no-store`; errores públicos propios y neutros, sin SQL/SDK/stack/secretos. Logs técnicos acotados al tipo o al identificador opaco del recurso para conciliación, nunca nombre de archivo, contenido o credenciales.

## Concurrencia y compensación

Dos cargas pueden subir recursos nuevos distintos, pero solo una actualiza la versión y adjunta imagen; la otra recibe 409 y elimina exclusivamente su propio recurso nuevo. No hay locking adicional ni borrado de imagen existente. El conflicto también protege una edición concurrente de datos.

Upload confirmado + fallo SQL revierte referencia y solicita eliminación del recurso nuevo. Ante fallo de upload/respuesta inválida también se intenta limpiar el id propio por si el proveedor llegó a crearlo. Sin configuración no se llama al SDK ni se pide cleanup.

Caso ambiguo: si UPDATE terminó y se pierde el acuse de COMMIT, se consulta si quedó referenciado el recurso. Si está confirmado se conserva y responde éxito; si no existe, se compensa. Si tampoco puede comprobarse por caída de DB, **no se elimina a ciegas un recurso posiblemente referenciado**: se registra conciliación pendiente y responde error. Fallo de cleanup/crash/timeout puede requerir reconciliación operativa por id/prefijo y referencias DB, según ADR-007; no se inventa una transacción distribuida ni una cola de limpieza en 2.2.

## UI, estados y accesibilidad

Control específico bajo el formulario de edición del producto seleccionado, sin rediseñar la página ni exigir imagen en el alta. Muestra: «La imagen es opcional mientras el producto permanezca oculto. Será necesaria para publicarlo». Imagen existente deshabilita la primera carga.

Input file real con etiqueta e instrucciones, botón nativo `Seleccionar imagen`, teclado/foco visible, drag & drop de un archivo, preview local con URL blob revocada al cambiar/desmontar, errores textuales y reintento manual que conserva el archivo. La comprobación del navegador ayuda al preview; no sustituye al decoder servidor.

Estados reales: vacío, drag-over, validando, archivo seleccionado, subiendo, procesando, éxito, error y reintento. `aria-live=polite`/status, alert para error, progress accesible y descripción textual. XHR mide bytes del envío del navegador a Next; solo muestra porcentaje si `lengthComputable`. Después del evento upload.load muestra procesamiento indeterminado mientras termina validación/Cloudinary/DB. Éxito solo con respuesta 200 validada de guardado. No hay timers para simular etapas o porcentajes; el único plazo de XHR es un timeout real de red.

No se cambia el borrador de datos de 2.1 al subir: la carga incrementa versión. Si se dejó abierta una edición anterior, el guardado obsoleto se rechaza; cerrar y reabrir edición obtiene la versión vigente sin sobreescribir ni limpiar silenciosamente entradas. La coordinación visual final entre datos e imagen pertenece a 2.5.

## Criterios de aceptación y pruebas

- [x] Sin sesión, origen ajeno o entrada inválida no se almacena ni se escribe imagen.
- [x] Producto inexistente/versionado obsoleto/imagen existente rechazados antes del proveedor.
- [x] JPEG/PNG/WebP, formato falsificado, corrupción, exceso de bytes y píxeles verificados con archivos de encoder real.
- [x] Éxito completo con DB real y proveedor controlado, preservando datos comerciales/oculto/C0.
- [x] Fallo SQL real mediante trigger provoca rollback y cleanup del nuevo recurso.
- [x] Dos primeras cargas concurrentes no se pisan y solo se limpia el recurso perdedor.
- [x] COMMIT confirmado con acuse perdido se reconcilia sin eliminar imagen válida.
- [x] UI con selección/drop, preview, carga, proceso, error/reintento, éxito y anuncios accesibles.
- [x] Smoke con credenciales y cuenta Cloudinary reales: upload, respuesta, entrega HTTPS y destroy. Ver evidencia real del 01/11/2026 al final; las notas anteriores describen el bloqueo historico.

Evidencia por capa:

- **Decoder/SDK/fakes:** `imagen-validacion.test.ts`, `imagen-cloudinary.test.ts`, `imagen-http.test.ts`, `imagen-cliente.test.ts` (33 pruebas). El SDK se sustituye sin red; verifica opciones autenticadas, bytes sin transformar, normalización jpg/jpeg, validación de respuesta, errores y limpieza idempotente. HTTP prueba lectura acotada ante Content-Length falso y origen/sesión antes del cuerpo. El decoder rechaza también una cabecera de 10.000 MP sin asignar ese raster.
- **PostgreSQL real:** `imagen-servicio.integracion.test.ts` (11 pruebas). Proveedor controlado; SQL, restricciones, transacciones y concurrencia reales. No demuestra disponibilidad/autenticación del proveedor remoto.
- **RTL:** `carga-imagen-producto.test.tsx` (10 pruebas); los eventos de imagen/XHR se controlan como dobles, no mediante timers artificiales.
- **Next/navegador real:** se amplía el E2E existente de Productos: desktop/notebook/mobile con selección/preview, respuesta 503 por ausencia de Cloudinary y reintento sin alterar Producto. También origen ajeno con sesión y POST real sin sesión. `playwright.config.ts` vacía las tres variables Cloudinary para impedir que cualquier E2E suba a una cuenta real.
- Suites ejecutadas: 280 unitarias/componentes, 56 PostgreSQL Producto/Inventario y cuatro E2E de Productos. Lint/typecheck y build correctos (el arnés E2E compila Next y levanta servidor de producción). `db:check` correcto; `db:generate`: sin cambios de schema ni nuevas migraciones. OpenSpec strict valida los tres changes; doctor saludable; `git diff --check` correcto. Persisten avisos previos de antigüedad de baseline-browser-mapping y deprecaciones de dependencias anteriores; no se amplía este slice para actualizarlas.

## Fuera de alcance y pendientes antes de 2.3

Sin reemplazo, publicación/ocultación/destacado, galería, CRUD de categorías, relacionados, demo persistida, catálogo público/SEO ni menú final de acciones. No se tocan los mocks actuales. 1.1, 2.3, 2.4, 2.5 y tareas de otros owners conservan su estado.

Configurar credenciales y probar upload/destroy reales antes de afirmar aceptación contra Cloudinary. Verificar cuotas, prefijos y límites/memoria/tiempo del hosting al desplegar. En 2.3 se coordinarán imagen anterior, cleanup posterior al commit y reintento operativo de limpieza; no están implementados aquí.

## Archivos y estado de entrega

- `package.json`, `pnpm-lock.yaml`, `.env.example`: dependencias/configuración documentada sin secretos.
- `app/api/admin/productos/[id]/imagen/route.ts`: composición del Handler.
- `lib/modulos/productos/imagen-{contrato,validacion,cloudinary,servicio,http,cliente}.ts`: tipos/errores, decoder, adaptador, caso de uso, HTTP y transporte del navegador; tests correspondientes en el mismo módulo.
- `administracion-contrato.ts`, `administracion.ts`: únicamente booleano `tieneImagen` en proyección propia del admin; DTO compartido intacto.
- `components/admin/carga-imagen-producto.tsx` y test; `productos-admin.tsx` y fixture de su test: integración mínima.
- `pruebas/imagenes-producto.ts`, `e2e/productos-2-1.spec.ts`, `playwright.config.ts`: archivos de prueba/aislamiento, sin semillas comerciales.
- Este documento y nota exclusiva de 2.2 en OpenSpec.

OpenSpec 2.2 permanece abierta con implementación y evidencia técnica disponibles para revisión; falta el smoke del proveedor real. Producto 1.1 está cerrada por las confirmaciones humanas registradas el 29/10/2026; 2.3–2.5 siguen sin marcar. Entrega en rama con commits, **sin merge/push** por instrucción expresa del responsable.

## Sincronizacion con Publico/SEO del 01/11/2026

Se incorpora `origin/main` en `276e5c0e2cfa1ec120c911f0c853691e18cce751` mediante merge normal sobre `feature/productos-2-2-imagen`, sin rebase ni perdida de `c0f5ec5`, `e5857c8`, `751cc39` y `dde6b2b`. Unico conflicto textual: `.env.example`; se conservan SITE_URL y las tres variables Cloudinary, sin valores reales. Las notas anteriores conservan sus estados historicos: ahora 2.4, 3.1-3.4 y 4.1-4.3 tambien estan completas por la linea integrada de main; 4.4 sigue parcial, 2.2/2.3/2.5 y 5.x abiertas. Se preserva la evidencia de ambas lineas, incluida la confirmacion humana de 1.1.

Revision combinada: Handler/adapter/Sharp y formulario mantienen primera carga, autorizacion, limites y control de version existentes. Publicar sigue exigiendo referencia persistida utilizable. La nueva regresion PostgreSQL de `imagen-servicio.integracion.test.ts` conecta carga con proveedor controlado, rechazo de publicacion sin imagen/version obsoleta, publicacion con version vigente y proyeccion PDP/metadata con URL/dimensiones correctas, sin identificadores privados. C0 permanece cero: PDP publicada agotada, fuera del listado. No se cambia codigo de produccion, Auth, Inventario, contratos compartidos ni migrations; no se implementan reemplazo o UI final.

Checks combinados: 301 unitarias/componentes; 148 PostgreSQL incluyendo la nueva regresion combinada; 16 E2E de Productos/Publico/SEO con dominio reservado solo de pruebas y dos E2E adicionales sin SITE_URL. Lint/typecheck y build de produccion (ejecutado por el arnes E2E) correctos. `db:check` correcto y `db:generate` sin cambios (11 tablas); las tres migrations existentes aplicadas en desarrollo se verifican contra sus hashes. OpenSpec strict valida los tres changes, doctor saludable y diff-check correcto. Docker/PostgreSQL se recuperan iniciando el contenedor existente, sin reinicializar volumen/datos; las pruebas usan exclusivamente la base aislada protegida por el arnes. Una repeticion de PostgreSQL se interrumpio por salida inesperada del worker Windows de Vitest (3221226505); el reintento completo de 148 pruebas paso sin cambios ni omisiones.

Las tres variables Cloudinary siguen ausentes en el entorno local efectivo; no se muestra ni modifica `.env.local`. Configurarlas alli es el unico bloqueo identificado para iniciar el smoke real. Los E2E mantienen las variables vacias expresamente para no subir a cuentas reales: no acreditan upload/destroy remoto. Smoke, asset real, persistencia con proveedor real y cleanup siguen pendientes, por lo que 2.2 no se cierra. Este checkpoint solo actualiza la rama de imagenes: sin merge a main ni push.

## Cierre con Cloudinary real del 01/11/2026

El responsable configuro las tres variables en `.env.local`: un proceso nuevo las detecto sin imprimir sus valores. PostgreSQL de desarrollo disponible y las tres migrations existentes aplicadas, verificadas contra sus hashes. Smoke ejecutado desde `0d0b373`, sobre una instancia Next dev nueva y la cuenta administradora existente con sesion real; sin cambios a Auth, configuracion, schema, migrations ni codigo de produccion. Los apartados anteriores se conservan como evidencia historica: el bloqueo de credenciales y smoke queda resuelto por esta comprobacion.

- Producto descartable creado mediante el formulario real: `b5b614ea-56ec-441d-8b02-107d2048350f`; no se usaron ni alteraron los siete fixtures. Precio `1234.56`, slug generado estable, oculto/no destacado y C0 en cero. Publicar sin imagen devuelve `imagen_requerida`.
- Seleccion/preview y upload desde el control real usando `public/images/products/angel-tears-gold-jewelry.png`: HTTP 200 y mensaje de exito en UI. Cloudinary autentico y almaceno un PNG de 1200 x 896; Admin API confirmo asset/version. Huella SHA-256 del asset_id, sin exponer identificadores de cuenta ni URL: `203fa4201b344607e5c683e0840eee485cedb771bf9a4de5463b3257bfbfa8f3`.
- Referencia completa de la respuesta comparada con PostgreSQL; version 1 a 2, datos comerciales/slug/flags y saldo sin cambios. Delivery HTTPS real HTTP 200, Content-Type image/png y SHA-256 de bytes recibidos igual al archivo original. No interceptacion, proveedor falso ni preset unsigned.
- Segunda primera-carga por el Handler real: HTTP 409 `imagen_existente`. Fila completa, saldo y asset original intactos; listado remoto por prefijo antes/despues conserva exactamente un asset.
- Publicacion invocada mediante el servicio existente con verificador de sesion real: version anterior rechazada; version vigente publica. PDP usa exactamente la URL persistida, imagen cargada en navegador con dimensiones naturales y OG coherente; C0 cero muestra Sin stock. Ocultar devuelve la PDP a 404 y conserva imagen/saldo. Sin UI anticipada de 2.5.
- Compensacion sin inyectar fallos ni crear triggers: segundo producto descartable `1628f884-49a1-4b2a-8769-7ca945f0eadc`, dos uploads simultaneos por el Handler real con version 1. Uno confirma; el otro devuelve 409 `conflicto_version` despues del upload. El CAS conserva version 2 y un solo recurso remoto: el perdedor se destruye mediante el adaptador real y el ganador sigue entregandose. Datos/slug/flags/C0 conservados.
- Cleanup final limitado a esos dos productos: retirar sus referencias/saldos en transaccion, comprobar ausencia de referencias antes de destroy y ejecutar `eliminarImagen` real, tambien repetido para comprobar idempotencia/not-found. Admin API confirma cero recursos en ambos prefijos; productos/saldos descartables ausentes. Comparacion de todas las filas Producto/Inventario previas y posteriores coincide. Sesion de smoke cerrada; no quedan assets o productos de prueba.

Limites: la carrera acredita compensacion real de un recurso nuevo no adjuntado y conservacion del confirmado. Fallo SQL forzado, COMMIT ambiguo, caida de DB y fallo de destroy mantienen las pruebas PostgreSQL/dobles ya existentes; no se provocaron con el proveedor real ni se introduce infraestructura artificial. Crash/timeout o limpieza fallida aun pueden requerir conciliacion operativa por referencias, conforme ADR-007. La invalidacion CDN no promete retirar instantaneamente copias cacheadas. Esto no implementa reemplazo ni certifica entrega responsive/CWV de 4.4.

2.2 completa tras smoke real; 2.3 y 2.5 abiertas, 4.4 parcial y 5.x sin marcar. El cierre solo modifica esta evidencia y OpenSpec; el script/ledger temporal local no contiene credenciales y no se versiona. Los E2E automatizados siguen vaciando Cloudinary para evitar uploads accidentales; su resultado se distingue de este smoke real.

Checks de cierre vueltos a ejecutar: 301 unitarias/componentes, 148 PostgreSQL y 16 E2E Productos/Publico/SEO, todos correctos. Lint/typecheck, build de produccion mediante el arnes E2E, db:check y db:generate (11 tablas, sin cambios ni nuevas migrations), OpenSpec strict (tres changes), doctor y git diff --check correctos. No fue necesario corregir codigo para pasar el smoke o estos checks.
