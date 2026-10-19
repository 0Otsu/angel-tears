# Spec Delta

## Purpose

Registrar y consultar compras de varios productos con costos históricos, fechas comerciales y efectos atómicos en stock, incluyendo anulación completa y trazable.

Fuente E1–E6 y D; RF-12..14 de referencia, SRS/RUP canónicos pendientes. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Registro multilínea histórico
El sistema SHALL registrar fecha real, líneas de producto/cantidad entera/costo histórico, total calculado y fecha automática de carga, con proveedor y nota opcionales; cambios posteriores no reescriben esa historia.

#### Scenario: Compra sin proveedor
- **WHEN** se registra una compra válida con varias líneas y sin proveedor
- **THEN** se conservan fecha real, líneas/costos y total sin exigir un proveedor ficticio.

#### Scenario: Mayor precisión monetaria
- **WHEN** un costo se ingresa con más de dos decimales
- **THEN** se rechaza sin redondeo silencioso ni registro parcial.

### Requirement: Confirmación con efecto único
El sistema SHALL confirmar cabecera, líneas, incremento de stock e historia como una unidad completa o sin efecto; la compra cuenta una sola vez y no se vuelve a registrar como egreso manual.

#### Scenario: Fallo y reintento
- **WHEN** falla un paso o se reintenta una solicitud ya confirmada
- **THEN** un fallo revierte todo y una repetición no duplica compra, stock ni gasto.

### Requirement: Confirmada no editable
El sistema SHALL impedir editar una compra confirmada; una corrección se realiza anulando según las reglas y registrando otra, sin borrar historia.

#### Scenario: Corrección de costo
- **WHEN** se detecta un costo incorrecto en una compra confirmada
- **THEN** no se sobrescriben sus líneas; se ofrece el procedimiento aprobado de anular y registrar nuevamente.

### Requirement: Anulación única sin negativos
El sistema SHALL conservar la compra anulada y revertir stock una sola vez; si cualquier reversión causaría saldo negativo, SHALL rechazar toda la anulación sin efectos parciales, incluso ante concurrencia.

#### Scenario: Stock consumido posteriormente
- **WHEN** parte del stock comprado ya no alcanza para revertir todas las líneas
- **THEN** compra, saldo y movimientos permanecen sin anulación aplicada.

#### Scenario: Doble anulación
- **WHEN** se solicita dos veces anular la misma compra
- **THEN** solo se produce una reversión y la historia conserva la anulación original.
