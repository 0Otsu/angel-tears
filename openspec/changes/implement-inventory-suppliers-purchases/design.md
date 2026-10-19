# Design

## Context

Ver proposal y blueprint 3–7/12. Fixtures actuales no implementan reglas. Claudio posee schemas Inventario/Proveedor/Compra, no Producto, y respeta DTO/IDs/constraints comunes.

## Goals / Non-Goals

Persistencia y operaciones de abastecimiento con efecto único; no duplicar Productos ni implementar Ventas/Público. Sin edición de confirmadas ni kardex contable/ERP.

## Decisions

- Inventario 1:1 Producto, saldo/minimo/version separados de Producto. crearSaldoCero recibe tx de alta Producto; módulos pueden probarse con puertos/dobles mientras se integra P0/C0, sin crear schema alternativo.
- Ajuste con tipo/cantidad/motivo/actor/fecha automática/clave de solicitud, movimiento append-only y saldo bajo lock. INICIAL no crea compra ni efecto financiero. No reemplazo directo del saldo ni saldo negativo.
- Mínimo null excluye alerta; cero real; comparación <=. Cantidades enteras positivas en comandos y CHECK de saldo/mínimo. Límites comerciales todavía no decididos se registran, no se inventan.
- Compra/CompraLinea/Supplier snapshot según blueprint. Confirmar calcula importes exactos desde strings; misma tx para cabecera/líneas/saldo/movimientos. Idempotencia por solicitud+fingerprint, no botón disabled como garantía.
- Anular bloquea cabecera y saldos por ID ordenado, verifica todo y registra reversas/estado juntos. Estado y origen/reversa únicos evitan doble efecto. No comienza nuevas tx dentro del contrato Inventario.
- FK comercial restrictiva y proveedor inactivo excluido de nuevas compras; no borrar históricos. Sin endpoint de baja para proveedores sin historial hasta decidirlo.
- UI de Stock/Proveedor/Compra reutiliza componentes, con Actions autorizadas y Zod en boundaries. Errores de falta de saldo al revertir no borran el formulario/contexto.

## Risks / Trade-offs

- Producto/DB/guard todavía no integrados → P0/E0/C0 mínimos coordinados; reglas/proveedores avanzan independientemente, aceptación real espera dependencia.
- Deadlock/reintento/resultado incierto → orden global de locks, clave estable y pruebas paralelas reales.
- Migraciones paralelas → coordinación de generación/journals; no reescribir migraciones aplicadas.
- Venta futura → diseñar contrato ahora, agregar schema/columnas FK de venta en R2, no tablas adelantadas para compilar R1.

## Migration Plan

Integración futura por C0 contratos + schema Inventario después de Producto → Proveedor → Compra/Linea y origen de movimientos. Aplicar solo migraciones revisadas en entorno aislado; verificar constraints/rollback. Conservar datos e historia; no volver a fixtures para ocultar fallo de operación.

## Open Questions

Baja de proveedor sin historial, límites de importes/fechas y restricciones de aplicación de saldo inicial no aprobadas. Resolver antes del comportamiento afectado; no bloquean proveedor activo ni ajuste explícito ya definido. SRS/RUP pendientes de formalización.
