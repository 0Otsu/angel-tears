# Spec Delta

## Purpose

Conservar existencias enteras e historia de ajustes y efectos de operaciones, evitando saldos negativos o modificaciones silenciosas. Las alertas usan un umbral general de tres aprobado por Sofi; los mínimos individuales persistidos quedan como legado compatible.

Fuente: B1–B6 y reglas aprobadas; RF-08 de referencia, ajustes/historia pendientes de formalización SRS/RUP. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Saldo único no negativo
El sistema SHALL mantener un saldo por Producto único y no permitir stock negativo, incluso con operaciones concurrentes o fallos; no existe un stock independiente dentro de otra representación de Producto.

#### Scenario: Decrementos concurrentes
- **WHEN** dos operaciones intentan consumir conjuntamente más stock del disponible
- **THEN** no pueden confirmar ambas dejando negativo ni aplicar efectos parciales.

### Requirement: Umbral general único de inventario
Por decisión comercial del responsable y Sofi, el sistema SHALL clasificar cero como Sin stock, uno a tres como Pocas unidades y cuatro o más como Disponible. Servicio, Inventario y Resumen SHALL compartir una regla pura independiente de mínimos históricos. La UI SHALL retirar su configuración individual. Esto reemplaza el criterio previo de alerta sin alterar movimientos ni registro de operaciones.

#### Scenario: Límites y transiciones
- **WHEN** el saldo pasa entre cero, uno, dos, tres y cuatro unidades
- **THEN** cero se clasifica Sin stock, uno a tres Pocas unidades y cuatro Disponible; conteos, orden, filtros y accesos Resumen a Inventario reflejan la misma clasificación.

#### Scenario: Compatibilidad de datos históricos
- **WHEN** un producto conserva mínimo individual null, cero o mayor que su saldo
- **THEN** ese valor no determina alertas ni prioridad y no se ofrece su edición en UI; columnas, valores y forma de los DTO compartidos permanecen intactos. stockBajo indica alerta general inclusiva (saldo cero a tres), no el criterio individual anterior.

#### Scenario: Sin alertas
- **WHEN** existen productos y todos tienen cuatro unidades o más
- **THEN** Resumen e Inventario muestran Todo el inventario está al día con conteos reales; un error de lectura no se interpreta como cero alertas.

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
