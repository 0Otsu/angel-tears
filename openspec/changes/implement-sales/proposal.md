# Proposal

## Why

Ventas es hoy una pantalla de muestra (`/admin/ventas`, dentro de Operaciones): no persiste nada, no valida stock y no descuenta Inventario. Era una capacidad de Ronda 2 sin owner. Tras la auditoría de `main` (`269b78c`), que da Auth/Cuenta por completa a nivel funcional, el equipo propuso a Emi tomar Ventas y ella la asumió el 02/11/2026.

## What Changes

- Owner: **Emi**. Ronda **2**, adelantada porque Auth/Cuenta quedó cerrada. Este turno es solo planificación: ninguna tarea está implementada.
- Registrar ventas con varias líneas, comprador opcional (Consumidor Final), precio histórico por línea, fecha real y fecha automática de carga; confirmar con verificación y descuento de stock en una sola transacción.
- Consultar ventas con su historia y anular conservándola, reintegrando el stock exactamente una vez.
- Consumir los contratos existentes: Inventario (`aplicarMovimientos`, `consultarDisponibilidad`), Productos (`consultarProductosInternos`) y Auth (`exigirAdministradora`/`conAdministradora`). No se crea otro sistema de stock.
- Fuera de alcance: Finanzas, resultado económico y Dashboard (leen ventas vigentes pero no se implementan aquí), medios de pago y cobros, comprobantes o facturación, módulo Clientes, descuentos o promociones, devoluciones o anulaciones parciales, edición o borrado de ventas confirmadas, Producto, Auth y la navegación del admin.

## Capabilities

### New Capabilities

- `ventas`: registro multilínea con precio histórico, confirmación atómica con stock, consulta y anulación única.

### Modified Capabilities

Ninguna en este change. La capacidad `inventario` pertenece al change de Claudio; el origen VENTA y las reversas se acuerdan con él como extensión de su contrato (ver Impact) y no se implementan sin su acuerdo.

## Impact

Futuro: schema `lib/infraestructura/esquemas/venta.ts` (tablas `venta` y `venta_linea`) con su migración, módulo `lib/modulos/ventas`, Actions y UI de `/admin/ventas`. Compartido, a coordinar con Claudio antes de editar: columna de origen `venta_linea_id` y CHECK de origen en `movimiento_stock`, `OrigenMovimiento` y soporte de reversas en el contrato de Inventario, y el orden de migraciones. Ventas puede avanzar contra un Inventario en memoria mientras tanto; la aceptación real espera esa extensión. No tocar Producto, Auth ni la navegación.

## Traceability

RF-15..17, referencia humana provisional; decisiones F1–F7 y B6 de [decisiones de producto](../../../docs/DECISIONES_PRODUCTO_MVP.md), [reglas de dominio](../../../docs/REGLAS_DOMINIO.md), [blueprint](../../../docs/BLUEPRINT_IMPLEMENTACION_MVP.md), [gaps](../../../docs/TRAZABILIDAD_MVP.md), ADR-003/005/006. No se crean RF ni CU nuevos; SRS/RUP canónicos siguen pendientes. Este change adelanta una capacidad de Ronda 2 por indicación del equipo; AGENTS.md y `config.yaml` todavía mencionan solo tres changes activos y habrá que actualizarlos si se acepta.

## Acceptance Criteria

Ventas persistidas con líneas e importes exactos; stock jamás negativo ni venta con stock insuficiente; confirmación completa o sin efecto; precio de cada línea inmutable ante cambios del Producto; anulación que conserva la venta y reintegra una sola vez, incluso con dos solicitudes simultáneas; repetición de la misma solicitud sin doble efecto; acceso solo con sesión de Administradora. Pruebas reales de concurrencia (dos ventas de la última unidad), rollback, idempotencia y guard contra PostgreSQL, y E2E del flujo completo; no basta con etiquetas visuales. No ejecutar tasks durante esta planificación.
