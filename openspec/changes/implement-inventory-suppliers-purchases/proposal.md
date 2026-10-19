# Proposal

## Why

Los saldos, proveedores y compras actuales son fixtures sin trazabilidad ni transacciones. Claudio implementará el abastecimiento de Ronda 1 con historia e integridad, consumiendo el único Producto de Augusto.

## What Changes

- Owner: **Claudio**. Ronda **1**. Solo planificación en esta entrega.
- Saldo/mínimo/stock bajo, ajustes explícitos e historial, saldo inicial identificado.
- Proveedores mínimos, consulta/modificación/inactivación; compras multilínea, historia y anulación atómica.
- Contratos compartidos crearSaldoCero/aplicarMovimientos/consultarDisponibilidad para Productos y futuras Ventas.
- Fuera de alcance: definir otro Producto, UI pública, Ventas/Finanzas de R2, categorías de gasto, precio/categoría/imagen/destacado, borrados no aprobados.

## Capabilities

### New Capabilities

- `inventario`: saldo, mínimos, ajustes e historia, con contrato transaccional de efectos.
- `proveedores`: información mínima, consulta, modificación e inactivación conservando historia.
- `compras`: registro multilínea, consulta histórica y anulación consistente con stock.

### Modified Capabilities

Ninguna: no hay specs principales previas.

## Impact

Futuro: schemas inventario/proveedor/compra y sus servicios/UI. Drizzle común y Auth E0 de Emi; schema Producto/DTO P0 de Augusto. Claudio puede avanzar Proveedores y reglas con dobles de contratos antes de integrar P0; no fabricar otro Product schema para desbloquearse. C0 entrega pronto saldo cero/efectos. Migraciones y package/lock se coordinan en serie.

## Traceability

RF-08..14, referencia humana provisional; B/D/E y RNF temáticos de consistencia/historia/error. Ajustes/saldo inicial/inactivación requieren sincronización SRS/RUP. [Blueprint](../../../docs/BLUEPRINT_IMPLEMENTACION_MVP.md), [gaps](../../../docs/TRAZABILIDAD_MVP.md), ADR-003/005/006. Baja de proveedor sin historia y restricciones no aprobadas se mantienen pendientes.

## Acceptance Criteria

Datos persistidos, mínimo null distinto de cero, saldo jamás negativo, ajustes con motivo/historia, compra completa o sin efecto y anulación única bloqueada si causaría negativo. Pruebas reales de concurrencia/rollback, guard y consultas; no suficiencia por etiquetas visuales. No ejecutar tasks durante este blueprint.
