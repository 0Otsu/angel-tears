## Why

RF-18, RF-19 y RF-20 del SRS vigente requieren registrar, consultar y anular egresos
manuales sin duplicar compras. Actualmente /admin/egresos consume una demostracion.
El responsable autoriza esta contribucion de Augusto en Ronda 2, sobre main f01ed62.
SRS y RUP canonicos fueron confirmados vigentes por el responsable el 10/11/2026.

## What Changes

- Egresos persistidos, fecha real/carga, importe ARS exacto mayor que cero (decision
  humana expresa de esta tarea), concepto y observacion opcional.
- Listado y detalle/historia autorizados, filtros por fecha real y estado.
- Registro idempotente y anulacion unica con historial conservado.
- Resumen exacto de vigentes para futuro consumo de Finanzas.
- UI responsive y migracion siguiente 0006, sin modificar migraciones anteriores.

## Capabilities

### New Capabilities
- `egresos`: egresos manuales administrativos y resumen por periodo.

### Modified Capabilities
Ninguna capacidad de Compras/Ventas/Inventario se redefine.

## Impact

Nuevo modulo lib/modulos/egresos, schema egreso.ts, UI/Actions de /admin/egresos,
migracion/journal/snapshot, pruebas y documentacion. La unica adaptacion del shell
retira el pie de demostracion de esta ruta. Sin Finanzas/Dashboard, nuevas dependencias,
deploy ni datos de ejemplo. Sin acceso comercial a PostgreSQL desarrollo o Cloudinary.
Frontera Auth por contrato existente; helpers puros de dinero e idempotencia se
reutilizan sin editar modulos vecinos. Ver docs/features/EGRESOS.md para fuentes.
