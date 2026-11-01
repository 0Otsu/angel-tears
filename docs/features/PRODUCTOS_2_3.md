# Producto 2.3: reemplazo seguro de imagen principal

## RF y CU relacionados

RF-06 Modificar producto de la [SRS vigente](https://docs.google.com/document/d/1SugCvtS4De8LImkAEiis5pGWY8Eg99TgWIXzBWMS72w/edit), conservacion del ultimo estado valido y una imagen principal; sin nuevos RF/CU. Identificadores exactos de CU pendientes de formalizacion con RUP. Reglas tecnicas en ADR-007/008 y change `implement-products-public-seo`.

## Objetivo y contexto

Desde main `41b77191836f9b5d1472dabc78cd3d68e9f8736d`, limpio y sin avance remoto tras fetch, rama nueva `feature/productos-2-3-reemplazo-imagen`. Reutilizar primera carga de 2.2, Cloudinary, Sharp y columnas existentes; permitir A a B sin perder A ante fallo previo al commit. No dependencias, schema, migrations ni cambios a Auth/Inventario.

## Diseno y reglas

- POST conserva primera carga y rechaza si ya existe imagen. PUT en la misma URL distingue reemplazo y exige imagen existente; mismo Handler acotado, guard real/origen, archivo/version, decoder y adapter. No nuevo campo multipart ni URL remota aceptada del cliente.
- JPEG/PNG/WebP reales, 3 MiB/20 MP; Sharp decodifica completamente, nombre/MIME no autorizan formato, bytes sin transformar. ID nuevo generado por servidor; nunca overwrite.
- Autorizacion y version vigente antes de subir. UPDATE en tx corta con CAS de id/version y referencia A capturada; escribe solo imagen/version/fecha. No locks durante upload, cambios comerciales, flags, slug ni saldo.
- Confirmar B en PostgreSQL antes de limpiar A. Antes de cada destroy consultar que ninguna fila referencie ese recurso; IDs no se reutilizan en los flujos de aplicacion. A compartida se conserva. Compensar solo B propio si falla upload/SQL/CAS. El perdedor de una carrera nunca limpia A ni el ganador.
- COMMIT sin acuse: buscar B persistida antes de decidir. Si esta confirmada, devolver exito y limpiar A; si no, compensar B. Si la lectura falla, no eliminar a ciegas A/B; error neutro y conciliacion operativa.
- Destroy de A posterior al commit no esta dentro del bloque que compensa B: ante fallo B sigue vigente y se devuelve exito con `limpiezaPendiente`. Log redactado con ID opaco, sin SQL/SDK/URL/secretos. Sin cola, worker ni cron.
- Revalidar admin, Home/catalogo/PDP y sitemap solo tras exito confirmado. Publico/metadata siguen leyendo la misma referencia persistida por solicitud, con URL nueva/versionada. Reemplazar no publica/oculta ni destaca.

## Errores y conservacion

| Caso | Resultado |
| --- | --- |
| Sin sesion / origen ajeno | 401 / 403 antes de consumir cuerpo o efectos. |
| Inexistente / no tiene imagen | 404 producto_inexistente / 409 imagen_requerida. |
| Version stale previa al upload | 409 version_desactualizada; no subir. POST conserva su codigo previo. |
| Archivo invalido | Codigos compartidos de tipo/bytes/pixeles/corrupcion; sin SQL ni upload. |
| Upload / proveedor | 502 error_proveedor; A vigente, compensar ID nuevo por posible respuesta perdida. |
| SQL falla tras upload | 500 error_persistencia; A vigente, limpiar B. |
| CAS concurrente | 409 conflicto_version; ganador intacto y limpiar solo B perdedor. |
| Confirmacion desconocida | 500 error_tecnico; no destruir recursos a ciegas. |
| Destroy postcommit falla | 200 ok + limpiezaPendiente; B vigente, A puede quedar huerfana. |

## UI minima

DTO administrativo propio agrega URL/dimensiones actuales, sin modificar contrato compartido ProductoInterno. El control existente muestra imagen vigente, boton Reemplazar, input/drop y preview separados; cancelar antes del envio revoca blob e ignora validaciones tardias. Progreso XHR real, procesamiento indeterminado, aria-live, errores/retry manual y aviso de cleanup. Ante error conserva imagen vigente/archivo; conflicto o confirmacion desconocida exige recarga antes de reenviar. Exito adopta B y su version, luego refresca. El formulario de datos conserva su politica de conflicto previa; coordinacion/redisenar listado/alta/menu queda en 2.5.

## Criterios y pruebas

- [x] A a B, version incrementada y destroy de A despues de commit real.
- [x] Upload/SQL/archivo/version/permisos fallidos conservan A; compensacion solo de B.
- [x] Cleanup postcommit fallido mantiene B con aviso y log seguro.
- [x] Dos reemplazos: solo uno confirma, perdedor limpiado y ganador intacto.
- [x] COMMIT ambiguo/relectura fallida no eliminan referencia valida.
- [x] UI PC/notebook/mobile, preview/cancel/error/retry y version vigente.
- [x] Regresion primera carga, publicacion y proyecciones/OG correctas.
- [x] Smoke Cloudinary real A a B, delivery y destroy A comprobados; datos descartables limpiados.

Pruebas automatizadas usan PostgreSQL aislado real y proveedor controlado, con fallo SQL mediante trigger ya usado por el proyecto. La carrera se sincroniza en el doble del proveedor para forzar dos uploads antes del CAS, no con timers. E2E Next real conserva Cloudinary vacio: comprueba PUT, sesion/origen/stale, seleccion/cancel/preview, 503/retry y A intacta. El smoke manual real se registra aparte, sin interceptar al proveedor.

## Fuera de alcance y riesgos

Sin galeria, borrado fisico de productos comerciales, nueva infraestructura de limpieza, optimizacion CDN/CWV, redisenar admin o tasks 2.5/4.4/5.x. Un crash/timeout, COMMIT incierto o destroy fallido puede dejar recursos pendientes; conciliacion operativa por IDs/prefijos y referencias antes de eliminar segun ADR-007. Un destroy confirmado no garantiza retirar inmediatamente copias cacheadas del CDN. No hay transaccion distribuida Cloudinary/SQL.

## Evidencia de cierre

01/11/2026. Smoke real con administradora/sesion existentes, instancia Next dev nueva y las tres variables disponibles, sin imprimir valores ni URLs del cloud. Producto descartable creado desde el formulario real: `5ad8a258-ec72-4c5d-8efa-b47e30ff2642`, independiente de los siete fixtures. A: `angel-tears-gold-jewelry.png`; B: `angel-tears-rings.png`, ambos originales conservados en `public/images/products/`, contenidos distintos. No proveedor falso, interceptacion de upload/delivery ni escritura directa para reemplazar referencias.

1. POST sube A y la confirma con SQL/Admin API. Publicar/destacar mediante el servicio existente con verificador de sesion real; version previa al reemplazo 4, precio `9876.54`, ambos flags true y stock cero.
2. POST de segunda carga mantiene 409 imagen_existente. PUT stale devuelve 409 version_desactualizada; SQL y listado remoto siguen con A sola.
3. UI muestra A y preview separado de B; cancelar no modifica SQL ni envia. Volver a elegir B y Guardar nueva imagen ejecuta PUT real, HTTP 200 y mensaje de reemplazo correcto.
4. PostgreSQL apunta a B, version 4 a 5. Referencia comparada con respuesta; todos los demas datos/slug/precio/flags y saldo exactamente iguales. B PNG 1200 x 896. Huellas SHA-256 de asset_id, sin identificadores de cuenta: A `e3b001f8e4253571e18b75f75dbdd890bc7f21fabf7b040911b7d95a74d2f872`, B `bbfb6512da172f817bc5f9af1ae16ccb47ed0af4bf4bb03c38f671c02f3e1130`.
5. Admin API responde 404 para A y confirma B; prefijo del producto contiene solo B. Delivery HTTPS B HTTP 200/image/png y bytes SHA-256 iguales al archivo original. UI/PDP cargan exactamente su URL persistida y OG coincide. PDP publicada agotada muestra Sin stock; Home/catalogo excluyen el producto por C0 cero. Ocultar devuelve 404 sin perder B.
6. Cleanup final: retirar solo ese producto/saldo descartables en tx y verificar ausencia de referencias antes de destroy. Admin API confirma cero recursos en el prefijo; SQL sin producto/saldo de smoke. Comparacion integral de filas Producto/Inventario anteriores/posteriores coincide; siete fixtures intactos. Sesion de la corrida satisfactoria cerrada mediante endpoint real.

El primer intento del comprobador local interpreto mal la envoltura de error 404 de Admin API; se corrigio solo ese script ignorado y se repitio todo el smoke hasta validar A ausente y B disponible. Ambos intentos limpiaron sus productos/assets. No se modifico adapter para sortear la comprobacion. Scripts/ledgers locales ignorados, sin credenciales versionadas.

Automatizadas: 308 unitarias/componentes y 161 PostgreSQL (incluidas 13 nuevas de reemplazo). Las nuevas verifican A a B y destroy posterior a commit visible desde otra conexion, rollback SQL real, fallo upload/destroy, CAS concurrente, stale, archivo/bytes/pixeles, permisos, referencia compartida y confirmacion ambigua. La proyeccion SQL comprueba tambien B en listados/destacados con stock positivo sin modificar codigo de Inventario. RTL cubre cancelacion incluso con decoder tardio, A conservada ante error, retry PUT/version vigente, B confirmada y aviso de limpieza.

E2E combinados: 20 casos de primera carga/reemplazo/Publico/SEO verificados, incluidas cuatro nuevas. Se inspeccionaron capturas desktop/mobile; notebook y ausencia de desborde horizontal tambien verificadas. Dos corridas se interrumpieron por salida inesperada del worker Windows (3221226505) en tests diferentes, una dejando fixtures en la base aislada. Las limpiezas SQL existentes, una repeticion completa 20/20 y la revalidacion final del archivo afectado 4/4 pasaron, sin alterar selectores ni omitir pruebas. Se documenta la incidencia del proceso de pruebas, sin atribuirle una causa no investigada.

Lint/typecheck, build de produccion del arnes E2E, db:check/db:generate (11 tablas, sin cambios), OpenSpec strict/doctor y diff-check verificados durante el cierre. Sin nuevas migrations/dependencias, cambios a Auth/Inventario o al DTO compartido ProductoInterno. El nuevo contrato de imagen/DTO admin solo amplian el modulo propio. Los casos de caida SQL, destroy fallido y confirmacion ambigua se fuerzan en pruebas aisladas/controladas, no contra la cuenta real; el smoke real acredita el camino A a B y destroy correcto. No se certifica que sea imposible dejar huerfanos ante crash: se conserva la conciliacion operativa del ADR.

2.3 completa. 2.5 permanece abierta para listado/alta/edicion y menu final de acciones, coordinacion de formularios/versiones y estados accesibles. 4.4 permanece parcial; no se marcan 5.x ni se implementa su UI en este cierre.
