# Egresos manuales

## Fuentes y alcance

Contribucion de Augusto en feature/egresos-manuales, base main f01ed62. Autorizada
por el responsable el 10/11/2026. Fuentes canonicas vigentes confirmadas por el:
- [SRS IEEE 830](https://docs.google.com/document/d/1SugCvtS4De8LImkAEiis5pGWY8Eg99TgWIXzBWMS72w/edit): RF-18 registro manual, RF-19 consulta por periodo con fuentes diferenciadas y RF-20 anulacion unica. Consultada en modo lectura, sin modificarla.
- [RUP](https://docs.google.com/document/d/1IrhOgqJVge5cLLQkOo09Rq-L1NjrH7yjcF2UP18UvCQ/edit), consultado sin modificar. No se asignan identificadores CU nuevos.
- Decisiones G1-G4/H1-H6, reglas de dominio y blueprint secciones 4-7/11; ADR-003/005/006/008.
- OpenSpec implement-manual-expenses. Estado tecnico no equivale a aceptacion humana/integracion.

Decision comercial explicita: importe estrictamente mayor que cero. No se deduce
de numeric ni se extiende a otras operaciones. Sin limite comercial de fechas o
longitud inventado. Limite tecnico numeric(18,2), precision maxima dos decimales;
rechazo previo a SQL, nunca redondeo. Solo ARS. Fecha comercial date sin conversion
UTC; carga/anulacion timestamptz automaticos. Se rechaza anio cero por compatibilidad
PostgreSQL, no por politica comercial.

RF-19 queda cubierto para la fuente manual: no se presenta como implementada aun
la composicion conjunta de Compras y Egresos en Finanzas (siguiente contribucion).
No se desarrolla RF-21, Finanzas, Dashboard, clasificacion contable, deploy ni seeds.

## Implementacion y limites de modulos

Modulo propio lib/modulos/egresos, paralelo a Compras/Ventas, para evitar que una
escritura manual dependa de servicios de Finanzas todavia no implementados. Schema
egreso.ts; RSC y Server Actions en /admin/egresos. No REST interno paralelo.

Se reutilizan sin modificar helpers puros ya utilizados por Ventas:
compras/dinero.ts (texto <-> centavos BigInt) e inventario/solicitud.ts (fingerprint).
No se invocan comandos de Compras/Ventas ni movimientos de Inventario. La unica
adaptacion compartida de UI es excluir /admin/egresos del pie de prototipo; no se
redisenan shell, Finanzas ni otras rutas. Mocks anteriores quedan conservados pero
la ruta Egresos deja de consumirlos.

Cada lectura exige Administradora; registrar/anular/detalle usan conAdministradora
por contrato/inyeccion. La pagina tiene guard propio. Sin cookies/sesiones nuevas.
Actions capturan excepciones con resultado seguro; logs solo incluyen tipo de error,
sin SQL, importes, credenciales ni cuerpo de solicitud. No hay borrado ni edicion.

## Confirmacion, concurrencia e historial

Registro: Zod normaliza strings/importe/nota, clave UUID estable + huella canonica,
INSERT ON CONFLICT bajo transaccion. Dos solicitudes iguales confirman una sola
fila; misma clave con otro contenido es conflicto. Concepto/importe/fecha iguales
con distintas claves son permitidos: pueden representar gastos legitimos distintos.
Retry luego de anular devuelve el mismo registro anulado, nunca lo reactiva.

Anulacion: lock FOR UPDATE sobre cabecera; solo CONFIRMADO -> ANULADO. Guarda fecha y
actor, conserva contenido/importe/carga. Segundo intento devuelve ya_anulado con el
registro actual; no reescribe fecha/actor ni genera otra historia. No hay stock.
Historial en detalle muestra los eventos de registro y anulacion; sus actores se
conservan en las FK de cabecera, sin tabla generica de eventos innecesaria.

No puede impedirse que una persona copie manualmente una compra con un UUID nuevo
solo por comparar textos. El formulario aclara la diferencia; no hay carga automatica
desde Compras ni agregado de esa tabla en consultas de Egresos.

## Consulta para el futuro consumidor Finanzas

crearAdministracionEgresos(...).resumir(headers, {desde,hasta}) autoriza y llama a
resumirEgresos(ejecutor, filtro), en lectura.ts. El ejecutor puede ser db o tx del
consumidor. La funcion interna requiere autorizacion previa por el llamador, como
resumirCompras/resumirVentas; no se expone directamente en una Action publica.

Salida: estado ok y resumen {desde,hasta,vigentes:{cantidad,total},anuladas:{cantidad}}.
total es string decimal exacto, vacio 0.00. Se suma solo egreso CONFIRMADO por fecha
real inclusiva. Sin filtros, abarca todas las fechas, como los modulos vecinos. La UI
usa mes actual America/Argentina/Cordoba por defecto y rango personalizado; no el dia
UTC. Limite de listado 50 (maximo 200), hayMas explicito; no se muestra un subtotal de
esa pagina como si fuera el total del periodo.

Finanzas debera componer fuentes bajo un corte consistente (p.ej. transaccion read-only
REPEATABLE READ) y restar Compras una sola vez. No se implementa esa composicion aqui.

## UI

Listado tabla desktop/tarjetas mobile con filtros GET por fecha y estado, detalle,
historial y confirmacion explicita de anulacion. Formulario sin upload ni dependencias
nuevas, mantiene texto y UUID al fallar; bloquea duplicados/cierre durante el envio.
Errores por campo con foco y aria-describedby. Ningun exito antes de respuesta del
servidor. Se refresca /admin/egresos tras commit; aviso transitorio existente.
Vacio, error de consulta y filtros invalidos son estados distintos. Anulados visibles
en historial, sin acciones de edicion/borrado ni duplicacion en totales.

## Migracion propuesta

0006_egresos-base.sql + snapshot 0006 y entrada nueva en journal. 0004 Ventas y 0005
Compras permanecen intactas. Solo CREATE egreso, indice/constraints y FK restrictivas
a user; sin DROP, alteraciones de otras tablas ni datos ficticios. Drizzle generate
repetido informa No schema changes, nothing to migrate; db:check correcto.

Aplicada unicamente por el arnes protegido a angel_tears_test. NO se ejecuta
db:migrate contra DATABASE_URL ni se modifica angel_tears_dev. Para probar esta
pantalla con la app de desarrollo habra que autorizar y aplicar 0006 siguiendo el
protocolo del equipo; no se presenta como lista en desarrollo antes de ese paso.

## Validacion ejecutada

- 32 unitarias/componentes de Egresos y Actions: dinero/fechas/rangos, entradas,
  validacion y foco, retry/clave estable, doble envio/cierre pendiente, errores seguros,
  estados/listado, detalle y confirmacion de anulacion.
- 9 PostgreSQL focalizados (guard _test): registro, exactitud maxima, FK/checks,
  duplicados concurrentes, conflicto de payload, anulacion concurrente, historial,
  filtros inclusivos por fecha real, exclusion de anulados, resumen vacio y permisos;
  consulta desde transaccion del consumidor y ausencia de escrituras en otras fuentes.
- 2 E2E focalizados desktop/mobile sobre Next de produccion y Auth real en _test:
  login/guard, registro/correccion de importe, listado historico, persistencia real,
  detalle/historial, anulacion y filtros, sin desborde horizontal.
- Build de produccion ejecutado por el arnes E2E, lint, TypeScript y db:check correctos;
  OpenSpec strict/doctor correctos. No suites completas, E2E masivos ni operaciones Cloudinary.

El primer intento E2E no pudo iniciar navegador porque faltaba Chromium del arnes;
se instalo el headless shell de la version de Playwright ya fijada, sin cambiar
package/lock, y se repitieron los dos recorridos con exito. CLI OpenSpec se ejecuto
con npx @fission-ai/openspec@1.14.3 al no estar en PATH. No nuevas dependencias del app.

Capturas locales de evidencia (generadas por E2E y revisadas; test-results ignorado):
egresos-desktop.png y egresos-mobile.png en los directorios de esos dos tests.
No equivalen a aprobacion visual del responsable.

## Criterios de aceptacion

- [x] Registro exacto con concepto/fecha requeridos, observacion opcional y carga automatica.
- [x] Reintentos y confirmaciones concurrentes sin duplicacion; conflictos comprensibles.
- [x] Autorizacion antes de efectos/lecturas; sin sesion se rechaza sin operar.
- [x] Listado por fecha real/estado y detalle con historia conservada.
- [x] Anulacion unica, exclusiones y conservacion de importes probadas en PostgreSQL.
- [x] Resumen reutilizable compatible conceptualmente con Compras/Ventas, sin stock.
- [x] Recorridos reales desktop/mobile en base aislada; estados, errores, foco y retry.
- [x] Aceptacion tecnica y visual humana (escritorio/movil), y autorizacion de integracion recibidas el 10/11/2026.

El merge efectivo se acredita mediante el PR de esta rama y su commit de integracion;
la autorizacion anterior no se presenta como prueba anticipada de que ya se integro.

## Pendientes

- Aplicacion deliberada de 0006 en desarrollo, fuera de esta ejecucion.
- Composicion de Finanzas para completar consulta conjunta RF-19/resultado RF-21.
- Aceptacion E2E transversal del proyecto y cierre operativo/seguridad/deploy posteriores.

El cierre Git autorizado no incluye migracion en desarrollo ni modificacion de
registros reales de Sofi. Revisar conexion, historial de migraciones y respaldo
antes de aplicar 0006 en una tarea posterior. Finanzas y Dashboard siguen fuera.
