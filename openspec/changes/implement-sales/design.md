# Design

## Context

Ver proposal y blueprint 3–7/12. `/admin/ventas` es una muestra y no existe persistencia de Ventas. Inventario (Claudio) ya expone `crearSaldoCero`, `aplicarMovimientos` y `consultarDisponibilidad`, pero `movimiento_stock` solo admite origen ajuste y el contrato no permite pedir reversas. Producto expone `consultarProductosInternos` (incluye ocultos) y Auth, `exigirAdministradora` y `conAdministradora`. Emi posee el schema de Venta y el módulo `lib/modulos/ventas`; respeta Producto, Inventario y Auth ajenos.

## Goals / Non-Goals

Persistir ventas multilínea con efecto único en stock, consultarlas y anularlas conservando la historia. No implementar Finanzas, medios de pago, clientes, descuentos, devoluciones parciales ni edición de confirmadas; no duplicar el saldo ni mutarlo fuera del contrato de Inventario.

## Decisions

- Schema `venta.ts` propio. `venta`: id, fecha de operación (misma representación que Compras y Finanzas, ADR-003), comprador nullable sin entidad Cliente, total ARS con dos decimales, estado CONFIRMADA/ANULADA, actor, clave de solicitud única y huella, fecha de carga, anulación (fecha y actor). `venta_linea`: venta, número de línea, producto, nombre y precio unitario históricos, cantidad entera positiva y subtotal, con unicidad por venta y número, índice por producto y al menos una línea. FK comerciales `ON DELETE RESTRICT`; las líneas son inmutables y no hay borrado ni edición.
- Registrar en una sola transacción: Zod en el borde, sesión antes del servicio, clasificación de la solicitud por clave y huella (misma clave y contenido recupera el resultado; otro contenido es conflicto), lectura de los productos internos (ocultos incluidos), inserción de cabecera y líneas con nombre y precio tomados en ese momento, y `aplicarMovimientos` con las variaciones negativas consolidadas por producto. Si falta stock se rechaza todo, se informa el disponible y el formulario conserva las cantidades, sin autoajustar.
- Anular: bloquear la cabecera, comprobar CONFIRMADA y pedir a Inventario las reversas de los movimientos de la venta en la misma transacción; el estado pasa a ANULADA y se conserva la historia. La unicidad de `reversa_de` y el estado impiden un segundo reintegro. Como solo incrementa saldo, la anulación no puede dejarlo negativo.
- Consultar: listado con estado y rango por fecha de operación, nunca por fecha de carga; detalle con líneas; comprador ausente se muestra como Consumidor Final en la presentación, no se guarda como dato.
- Dinero: ARS en cadenas con hasta dos decimales y aritmética en centavos; más precisión se rechaza sin redondeo. Reutilizar `compras/dinero.ts` o moverlo a un lugar común queda por acordar con Claudio.
- Autorización con `exigirAdministradora` o `conAdministradora` en cada lectura y comando. Después del commit, los productos afectados refrescan Home, catálogo y PDP desde el límite Next, nunca dentro de la transacción.
- UI: reemplazar la muestra de `/admin/ventas` por formulario multilínea con selector de productos internos, listado y anulación, con errores accesibles y sin edición de confirmadas. No se toca la navegación del admin.
- Mientras falte la extensión de Inventario, Ventas se desarrolla contra el contrato con el Inventario en memoria ya existente y no se crea otro modelo de saldo.

## Risks / Trade-offs

- Extensión de Inventario sin acordar (origen VENTA y reversas) → bloquea la integración real; se avanza con dobles y se deja la integración para el final.
- Dos migraciones tocan el mismo CHECK de `movimiento_stock` → cada una lo reescribe incluyendo los orígenes existentes y quien integra segundo regenera la suya; no se reescriben migraciones aplicadas.
- Dos ventas de la última unidad, doble envío o respuesta perdida → locks ordenados por producto, clave estable y pruebas paralelas reales.
- Plazo corto → se prioriza el núcleo transaccional y una pantalla simple; pulidos y E2E amplios se recortan antes que las pruebas de invariantes.

## Migration Plan

Primero el change y la coordinación con Claudio; después schema `venta.ts` con su migración (número según el orden acordado), extensión de `movimiento_stock` en el mismo turno que él, servicios, Actions e interfaz. Aplicar solo migraciones revisadas contra una base aislada y verificar constraints y rollback. Sin datos de demostración en producción ni vuelta a la muestra para ocultar un fallo.

Actualización técnica del 09/11/2026: Claudio integró en `main` el contrato de reversas de Inventario (`reversaDe` en cada variación de `aplicarMovimientos` y `consultarMovimientosDeOrigen`), así que Ventas lo usa tal cual y no define uno propio. Ventas solo aporta el origen VENTA: `venta_linea_id` y el CHECK de origen único en `movimiento_stock`, el caso `VENTA` en `OrigenMovimiento` y en los puntos de extensión de `persistencia.ts`, junto con el schema `venta.ts` en la migración `0004_ventas-base` (Compras todavía no tiene migración). Para anular, la anulación pide a Inventario los originales de las líneas con `consultarMovimientosDeOrigen` y aplica las variaciones opuestas con `reversaDe`. Detalle, archivos y pruebas en la [bitácora](../../../docs/features/VENTAS.md). Queda pendiente que Claudio revise el orden de migraciones frente a Compras.

## Open Questions

Precio de la línea: ¿siempre el actual del Producto o la Administradora puede indicar otro (el diagrama de actividad del CU-15 habla de «precios aplicados»)? ¿La anulación pide un motivo? Se asume que no se registran medios de pago, a confirmar. Límites de líneas, cantidades, importes y fechas (futuras o antiguas) no están definidos y no se inventan. Quién escribe las reversas y el CHECK de origen, y el número de migración, se resuelven con Claudio. SRS/RUP pendientes de formalización.

## Workflow

Rama propia `ebenitez-ventas` desde `main` actualizado; coordinar con Claudio todo lo compartido antes de editarlo. Antes de integrar: tests, lint, typecheck, build, validación OpenSpec estricta y revisión del diff; recién entonces merge y aviso al equipo. Bitácora `.md` de avance. Archivar solo tras aceptación técnica con evidencia, nunca en esta planificación.
