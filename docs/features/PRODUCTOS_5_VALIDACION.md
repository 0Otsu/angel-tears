# Productos 5.x — validacion focalizada del 07/11/2026

## Objetivo y alcance

Preparar la revision humana del diff local sobre main `2117c5758f576baef4ceac32f6be93001dab9675`,
sin integrar ni afirmar aceptacion global. Reutiliza los requisitos y escenarios del
change implement-products-public-seo; no crea RF/CU ni reglas nuevas. Trazabilidad
academica pendiente segun docs/TRAZABILIDAD_MVP.md. Sin cambios a otros owners.

## Evidencia de la pasada focalizada previa

194 pruebas focalizadas (21 archivos) correctas, solo unitarias/componentes:

| Recorrido | Evidencia ejecutada en esta pasada | Limite |
| --- | --- | --- |
| Alta/edicion | administracion, reglas, precio-admin, productos-admin/editor | Mocks de comandos; no se escribio PostgreSQL |
| Imagenes | cliente, HTTP, validacion, adapter Cloudinary, carga-imagen y uploaders | Seleccion/cola/progreso/retry, validacion y reemplazo; SDK sustituido, sin red Cloudinary |
| Publicacion/ocultacion/destacado | publicacion, editor-producto y listado | Guard/errores/version, feedback y modal tras ok; sin comandos reales |
| Preview/listado/filtros/navegacion | vista-previa, editor, productos-admin y page.test | Lecturas/acciones sustituidas; foco inicial, Escape y retorno de foco en DOM simulado |
| Catalogo/PDP/SEO | presentacion, metadata y datos-estructurados | Reglas y formato unitarios; no equivale a nueva integracion PostgreSQL |
| Integracion stock | page.test verifica autorizacion previa, consulta agrupada y fallo desconocido | Reutiliza consultarDisponibilidad; Inventario no se modifica; no se ejecutan movimientos |

Lint, TypeScript (`next typegen && tsc --noEmit`), OpenSpec strict (3 changes),
doctor y diff-check correctos. No suite completa, E2E ni build en esta pasada.
Los tests PostgreSQL existentes de galeria, reemplazo, publicacion y preview siguen
disponibles, pero NO se presentan como ejecutados ahora. Evidencias historicas en
PRODUCTOS_2_2.md, PRODUCTOS_2_3.md, PRODUCTOS_GALERIA.md y PRODUCTOS_PREVIEW_AUTO_UPLOAD.md.

Lectura HTTP real, sin modificar datos: Home y catalogo 200; las siete PDP reales
200, con titulo por producto y JSON-LD. Listado autorizado abierto en Chrome muestra
siete productos reales. Esto prueba lecturas actuales; no prueba escrituras ni
escenarios oculto/agotado en vivo. Upload a cuenta de Sofi y responsive del listado
confirmados por el responsable en el chat; no repetidos mutando su dataset.

## Icono de marca

El archivo suministrado se llamaba realmente app/icon.png.png. Se preserva el
original en work/marca/icon-original.png (ignorado), y se generan desde el mismo
recurso, mediante Sharp ya instalado: app/icon.png 512x512, app/apple-icon.png
180x180 y app/favicon.ico 32x32. PNG con paleta optimizada; sin nuevo logo ni paquetes.
No se modifica layout, titulo, descripcion, canonical ni metadatos por producto.

HTML de Home/catalogo incluye rel=icon (32 y 512) y rel=apple-touch-icon (180).
Rutas 200 con MIME y dimensiones correctos. Reduccion revisada a 16/32/180 px:
identidad conservada, texto pequeno poco legible por el detalle del original;
no se recorta ni inventa otro isotipo. No se afirma instalacion PWA.
La revision automatizada de favicon en la barra de pestanas fue bloqueada por la
herramienta. Posteriormente el responsable confirma satisfactoriamente favicon,
listado, responsive, modal de publicacion, navegacion y catalogo. Es evidencia manual
declarada por el usuario, no una comprobacion automatizada ni certificacion universal
de dispositivos/navegadores.
Evidencia HTTP y previsualizacion local: work/marca/.

## Revision del diff y mantenibilidad

- Modal Radix, acciones, UI de tabla y menu existentes reutilizados; no segunda
  implementacion de publicacion, uploader ni saldo de inventario.
- Tabla/tarjetas comparten controles, filtros y estado; stock desconocido no se
  convierte en cero. El DTO compartido de Producto no duplica existencias.
- Diagnostico Cloudinary conservado: categorias fijas, HTTP numerico acotado,
  codigos de red permitidos y presencia booleana. Ningun error crudo, mensaje,
  URL, respuesta SDK, identificador de asset ni secreto sale en ese log.
  Pruebas explicitas de redaccion incluidas; sin alterar upload/destroy/compensacion.
- next-env.d.ts es generado. Typegen normalizo el import a .next/types/routes.d.ts;
  ya no hay diff que integrar. No versionar una ruta dependiente del dev server.
- Selectores de tres E2E actualizados para tabla/Editar/modal, sin retirar aserciones;
  no ejecutados ahora. Sin schema, migraciones, lockfile o dependencias nuevas.
- Saneamiento local anterior: seis UUID autorizados retirados con backup, rollback
  previo y comparacion de filas ajenas; no forma parte del codigo a integrar ni se
  repite aqui. Evidencia privada ignorada en work/limpieza-productos-demo-resultado.json.

## Cierre tecnico final — comprobaciones ejecutadas

Git: rama main, HEAD local y main remoto consultado mediante git ls-remote coinciden
en 2117c5758f576baef4ceac32f6be93001dab9675. Sin fetch que actualice referencias,
checkout, integracion de cambios de companeros, commit, merge, rebase ni push.

Integracion focalizada: **98 pruebas / 10 archivos correctos**, usando exclusivamente
angel_tears_test. Se ejecutan administracion y persistencia Producto; primera carga y
reemplazo; galeria y backfill; publicacion; preview; consultas de catalogo y contrato
compartido de persistencia Inventario. Autorizacion, atomicidad, concurrencia/version,
compensacion con proveedor doble, principal/cupo/quitar, oculto/agotado/elegibilidad y
no negatividad/idempotencia estan cubiertos segun los escenarios existentes.
El arnes y globalSetup llaman validarUrlBdPruebas: host local, sufijo _test y destino
distinto de DATABASE_URL. No se relaja la guardia. El arnes aplica migraciones solo
a _test y usa registros propios; ningun SQL se ejecuto sobre desarrollo/produccion.

Build de produccion Next/Turbopack: correcto, incluida comprobacion TypeScript y
generacion de rutas. Su DATABASE_URL se sobrescribe solo en el proceso hijo con la
URL de _test ya validada; la configuracion persistida no se modifica. Las variables
Cloudinary se dejan vacias solo en los procesos de checks: ninguna operacion real.

El primer build detecto un defecto concreto: favicon.ico contenia PNG interno RGB,
incompatible con el decoder ICO de Turbopack (exige RGBA). Se regenera unicamente
ese contenedor desde los mismos pixeles con canal alpha; 32x32 y marca conservados.
La repeticion normal de build termina correctamente; no se cambia bundler ni config
para ocultar el error. Logs locales: work/cierre-productos-build-intento1.log,
work/cierre-productos-build.log y work/cierre-productos-integracion.log.

Adicionales actuales: 26 pruebas unitarias (19 del adapter Cloudinary y 7 de guardia
BD), lint, db:check, OpenSpec strict/doctor y diff-check correctos. Las 194 unitarias/
componentes previas siguen siendo evidencia separada, no se suman como pruebas nuevas
unicas porque hay superposicion. No se ejecuto suite completa ni E2E en esta ronda.
Aviso no bloqueante de baseline-browser-mapping antiguo; sin actualizar dependencias
como parte de este cierre. Sin cambios en codigo/schema/migraciones de otros owners.

## Archivos a incluir y propuesta de commit

Incluir exclusivamente los 21 archivos del diff revisado:

- app/admin/(panel)/productos/page.tsx y page.test.ts.
- components/admin/acciones-producto.tsx, editor-producto.tsx, editor-producto.test.tsx,
  productos-admin.tsx, productos-admin.test.tsx y vista-previa-producto.tsx.
- lib/modulos/productos/imagen-cloudinary.ts y imagen-cloudinary.test.ts.
- e2e/productos-2-1.spec.ts, productos-preview.spec.ts y productos-ux-cierre.spec.ts:
  adaptacion de selectores/asserts al comportamiento aceptado; no se afirma ejecucion actual.
- app/icon.png, apple-icon.png y favicon.ico.
- docs/features/PRODUCTOS_PREVIEW_AUTO_UPLOAD.md, PRODUCTOS_UX_CIERRE.md y este documento.
- openspec/changes/implement-products-public-seo/tasks.md y specs/productos/spec.md.

Excluir next-env.d.ts generado (sin diff), .next, tsbuildinfo, work, logs, capturas,
scripts operativos de limpieza/checks, dumps y manifiestos privados, node_modules y
cualquier .env/credencial. Ningun package/lock o archivo de migraciones se modifica.

Propuesta, no ejecutada:

```text
fix(productos): cerrar UX administrativa y diagnostico de imagenes

Confirmar publicacion con dialogo accesible y disponibilidad real.
Compactar listado responsive, conservar acciones y agregar iconos de marca.
Registrar diagnostico Cloudinary sin secretos y evidencia de validacion.
```

## Aceptacion y recomendacion

El responsable confirma manualmente listado, responsive, modal, navegacion, favicon y
catalogo, ademas de la subida real a la cuenta Sofi en una etapa anterior. El agente
ejecuta los checks detallados; no se atribuye esa revision manual ni repite uploads.
Siete productos reales y saneamiento anterior se conservan sin lecturas/escrituras
operativas nuevas contra desarrollo en esta ronda.

**Recomendacion: diff tecnicamente apto para integrar tras aprobacion del responsable.**
5.2 completa dentro del alcance focalizado autorizado; documentacion y pendientes
academicos/dominio se conservan explicitamente, sin inventar RF/CU.
5.1 sigue abierta: sus E2E completos con ajuste/compra y transiciones del publico no
se ejecutaron en esta ronda; pruebas PostgreSQL por modulo y aceptacion visual no
equivalen a ese recorrido integrado. Coordinacion con Claudio para dependencias,
sin desarrollar otro stock ni implementar Compras en esta tarea.
5.3 completada posteriormente bajo autorizacion expresa: commit
4215c6972b4c7b03a868eb5097f80569904ab769 con exactamente 21 archivos aprobados,
integrado desde fix/productos-cierre-tecnico a main por fast-forward desde 2117c57.
Push sin force correcto; ls-remote confirma main remoto igual a HEAD local y arbol
limpio. La evidencia de 5.3 se actualiza en un commit documental posterior a esa
verificacion, no antes de realizar la integracion. 5.1 sigue abierta; no se ejecuta
el E2E integrado en esta operacion. No declarar todas las 5.x cerradas mientras
falte esa aceptacion. La UX de Productos queda aceptada por el responsable;
no se propone mas funcionalidad ni redisenos. 4.4 conserva cierre tecnico y limites
de campo; video/deploy/security siguen fuera de esta tarea.
