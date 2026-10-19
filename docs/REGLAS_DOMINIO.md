# Reglas del dominio

Estas reglas recogen lo indicado para la base inicial. Deben contrastarse con la SRS validada y los artefactos RUP corregidos, que tienen prioridad. No constituyen una nueva numeración de requisitos.

## Productos

- Un producto puede estar visible/publicado u oculto.
- Ocultarlo no lo elimina y puede volver a publicarse.
- Un producto oculto puede venderse internamente si tiene stock.
- El catálogo público muestra únicamente productos publicados con disponibilidad.

Decisiones A/C/L y actualización expresa del 19/10: listados solo publicado + stock>0; PDP publicada agotada accesible con «Sin stock»; oculto responde 404. Reponer stock recupera listado si sigue publicado. No eliminación física, slug estable al renombrar y precio actual sin alterar historia. Destacado es flag simple y solo participa públicamente si además está publicado/con stock; no cambia la regla de PDP. Nombre/precio/categoría requeridos, imagen requerida para publicar pero no para guardar oculto, opcionales sin inventarlos. Categorías fijas aprobadas, sin CRUD. Detalle en [decisiones](DECISIONES_PRODUCTO_MVP.md).

## Stock

- El stock nunca puede ser negativo.
- El stock mínimo es opcional.
- Un producto sin mínimo no participa en la consulta de stock bajo.

Stock bajo: `stock <= minimo`; mínimo cero es real y distinto de null. Unidades enteras. Ajustes explícitos de incremento/decremento con cantidad, motivo obligatorio, fecha automática e historia, nunca reemplazo silencioso. Saldo inicial identificado sin compra ficticia ni efecto económico. No duplicar el saldo en Producto. Si venta supera disponible: bloquear, informar saldo y conservar formulario sin autoajustar cantidad. Restricciones comerciales no aprobadas permanecen en decisiones pendientes.

## Proveedores

Nombre obligatorio; teléfono/Instagram/notas opcionales. Proveedor opcional en compra. Usado históricamente no se elimina; inactivo se excluye de nuevas compras. Compra conserva nombre del proveedor de ese momento aunque se renombre. Baja sin historial no definida; no habilitar por inferencia.

## Compras

- Una compra confirmada aumenta stock.
- Su importe cuenta una sola vez en el resultado económico.
- Conservar importes históricos; cambios posteriores no deben reescribir operaciones pasadas.
- La operación se aplica completamente o no se aplica: no se admiten cambios parciales.
- La anulación revierte stock una sola vez.
- Bloquear la anulación si provocaría stock negativo, sin aplicar una reversión parcial.
- Fecha real de compra + fecha automática de carga; múltiples líneas/costos históricos, nota/proveedor opcionales y total calculado. No editar confirmadas: anular según reglas y registrar otra.

## Ventas

- Verificar stock antes de confirmar.
- Stock insuficiente impide registrar la venta y no modifica stock.
- Una venta confirmada descuenta stock.
- El comprador es opcional; se admite Consumidor Final.
- Conservar precios históricos de la operación.
- La anulación reintegra stock una sola vez.
- Múltiples líneas, fecha real + fecha automática de carga. No editar confirmadas: anular y registrar otra; no crear módulo Clientes.

## Egresos

- Compras y egresos manuales no deben duplicarse: una compra no debe descontarse también como egreso manual.
- Un egreso manual puede anularse y se conserva su historial.
- Un egreso anulado no integra resultados vigentes.
- Concepto/importe/fecha real obligatorios, nota opcional y fecha de carga automática. No editar confirmados: anular y registrar otro. Finanzas agrupa Egresos y Resultado sin categorías de gastos complejas ni Reportes paralelo.

## Resultado económico aproximado

**Ventas vigentes - compras vigentes - egresos manuales vigentes.**

Las operaciones anuladas quedan fuera de los importes vigentes; se conserva su historial. No representa ganancia contable ni contabilidad profesional. No sustituir la fórmula por margen, costo de mercadería vendida u otro cálculo sin validación de las fuentes y del equipo.

ARS, hasta dos decimales; rechazar mayor precisión sin redondeo silencioso. Mes actual por defecto, otro mes o rango personalizado; filtrar por fecha real, nunca fecha de carga. Dinero/fechas se representan técnicamente según ADR-003, sin modificar la fórmula ni convertirlo en ganancia contable.

## Consistencia de operaciones críticas

Las verificaciones y modificaciones deben preservarse de forma atómica, también frente a operaciones simultáneas. La estrategia concreta de locks, idempotencia y reversión única está diseñada en [blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md) / ADR-003 y no implementada. Los tests deben probar efectos e invariantes, no solo el camino exitoso.

Confirmadas/anuladas conservan historia; correcciones por anular/recrear, sin anulaciones parciales aprobadas. Límites de importes/fechas y otras restricciones no respondidas siguen pendientes. La tarea actual consolida decisiones humanas, no modifica SRS/RUP externos ni crea RF/CU.
