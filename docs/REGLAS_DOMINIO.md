# Reglas del dominio

Estas reglas recogen lo indicado para la base inicial. Deben contrastarse con la SRS validada y los artefactos RUP corregidos, que tienen prioridad. No constituyen una nueva numeración de requisitos.

## Productos

- Un producto puede estar visible/publicado u oculto.
- Ocultarlo no lo elimina y puede volver a publicarse.
- Un producto oculto puede venderse internamente si tiene stock.
- El catálogo público muestra únicamente productos publicados con disponibilidad.

Los criterios detallados de disponibilidad y los efectos de ocultar un producto sobre acceso directo e indexación quedan pendientes. No confundir visibilidad pública con permiso para vender internamente.

## Stock

- El stock nunca puede ser negativo.
- El stock mínimo es opcional.
- Un producto sin mínimo no participa en la consulta de stock bajo.

Queda pendiente precisar si el umbral de stock bajo se compara con `<` o `<=`, junto con tipos de cantidades y validaciones de valores. No asumir una fórmula de alerta no confirmada.

## Compras

- Una compra confirmada aumenta stock.
- Su importe cuenta una sola vez en el resultado económico.
- Conservar importes históricos; cambios posteriores no deben reescribir operaciones pasadas.
- La operación se aplica completamente o no se aplica: no se admiten cambios parciales.
- La anulación revierte stock una sola vez.
- Bloquear la anulación si provocaría stock negativo, sin aplicar una reversión parcial.

## Ventas

- Verificar stock antes de confirmar.
- Stock insuficiente impide registrar la venta y no modifica stock.
- Una venta confirmada descuenta stock.
- El comprador es opcional; se admite Consumidor Final.
- Conservar precios históricos de la operación.
- La anulación reintegra stock una sola vez.

## Egresos

- Compras y egresos manuales no deben duplicarse: una compra no debe descontarse también como egreso manual.
- Un egreso manual puede anularse y se conserva su historial.
- Un egreso anulado no integra resultados vigentes.

## Resultado económico aproximado

**Ventas vigentes - compras vigentes - egresos manuales vigentes.**

Las operaciones anuladas quedan fuera de los importes vigentes; se conserva su historial. No representa ganancia contable ni contabilidad profesional. No sustituir la fórmula por margen, costo de mercadería vendida u otro cálculo sin validación de las fuentes y del equipo.

Períodos, fechas aplicables, moneda y redondeo siguen pendientes; no introducirlos como reglas aceptadas.

## Consistencia de operaciones críticas

Las verificaciones y modificaciones deben preservarse de forma atómica, también frente a operaciones simultáneas. La estrategia concreta de transacciones, concurrencia y reversión única se decidirá al elegir la persistencia. Los tests deberán probar efectos e invariantes, no solo el camino exitoso.

El modelo detallado de estados, campos, anulaciones parciales y correcciones no está definido: no inferir nuevas funcionalidades.
