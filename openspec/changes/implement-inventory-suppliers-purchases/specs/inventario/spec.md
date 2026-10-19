# Spec Delta

## Purpose

Conservar existencias enteras, mínimos opcionales e historia de ajustes y efectos de operaciones, evitando saldos negativos o modificaciones silenciosas de inventario.

Fuente: B1–B6 y reglas aprobadas; RF-08 de referencia, ajustes/historia pendientes de formalización SRS/RUP. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Saldo único no negativo
El sistema SHALL mantener un saldo por Producto único y no permitir stock negativo, incluso con operaciones concurrentes o fallos; no existe un stock independiente dentro de otra representación de Producto.

#### Scenario: Decrementos concurrentes
- **WHEN** dos operaciones intentan consumir conjuntamente más stock del disponible
- **THEN** no pueden confirmar ambas dejando negativo ni aplicar efectos parciales.

### Requirement: Mínimo opcional y alerta inclusiva
El sistema SHALL considerar stock bajo cuando saldo <= mínimo, excluir productos sin mínimo y tratar cero como un mínimo real distinto de ausencia.

#### Scenario: Igualdad y mínimo ausente
- **WHEN** saldo y mínimo son iguales, o el mínimo está ausente
- **THEN** el primer caso participa en alerta y el segundo no.

#### Scenario: Mínimo cero
- **WHEN** el saldo es cero y el mínimo es cero
- **THEN** participa en alerta sin interpretar el mínimo como ausente.

### Requirement: Ajuste explícito con historia
El sistema SHALL permitir incremento/decremento entero con cantidad, motivo obligatorio, fecha automática e historial; SHALL rechazar reemplazar silenciosamente el saldo o un decremento que produzca negativo.

#### Scenario: Ajuste insuficiente
- **WHEN** un decremento supera el saldo
- **THEN** se rechaza sin cambiar saldo o registrar un ajuste aplicado.

#### Scenario: Motivo ausente
- **WHEN** se intenta confirmar sin motivo
- **THEN** no se aplica el ajuste y se informa el dato requerido.

### Requirement: Stock inicial identificado
El sistema SHALL registrar existencias iniciales como saldo/ajuste identificado sin compra ficticia ni efecto en el resultado económico.

#### Scenario: Carga de existencias previas
- **WHEN** se registra stock inicial
- **THEN** su origen queda identificado en la historia y no se suma un gasto de compra al resultado.

### Requirement: Efectos íntegros e irrepetibles
El sistema SHALL aplicar saldo e historia junto con la operación de origen, una sola vez; repetir una misma solicitud lógica no duplica efectos y los fallos conservan el estado anterior completo.

#### Scenario: Respuesta perdida después de confirmar
- **WHEN** se repite la misma solicitud lógica cuyo resultado ya se confirmó
- **THEN** se recupera el resultado existente sin otro cambio de saldo ni movimiento duplicado.

#### Scenario: Fallo intermedio
- **WHEN** falla el registro de la operación antes de completar todos sus efectos
- **THEN** no quedan saldo, cabecera o historia parcialmente modificados.
