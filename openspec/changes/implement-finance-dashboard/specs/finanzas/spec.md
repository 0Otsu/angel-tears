## ADDED Requirements

### Requirement: Resultado económico autorizado y exacto
El sistema SHALL consultar únicamente con sesión administrativa y calcular Ventas vigentes menos Compras vigentes menos Egresos manuales vigentes, por fecha de operación inclusiva, como resultado de gestión y no ganancia contable.

#### Scenario: Tres fuentes vigentes y operaciones anuladas
- **WHEN** se consulta un período con operaciones vigentes y anuladas
- **THEN** cada fuente aparece diferenciada, las anuladas no integran el importe, y Compras no se duplica como egreso manual

#### Scenario: Resultado vacío o negativo
- **WHEN** no hay operaciones o las salidas superan las ventas
- **THEN** se muestra cero real o resultado negativo exacto, sin importes inventados

#### Scenario: Falta una fuente
- **WHEN** una consulta falla
- **THEN** se conserva la información sana y el resultado conjunto se muestra no disponible

### Requirement: Consulta por período y evolución persistida
Finanzas SHALL permitir Semana/Mes/Año con navegación anterior/siguiente, mes actual inicial y agrupaciones diarias/semanales/mensuales exactas; consultar Compras/Egresos como tipos diferenciados, y mostrar evolución únicamente desde operaciones persistidas vigentes.

#### Scenario: Fecha de carga diferente de operación
- **WHEN** una operación fue cargada fuera del período de su fecha de operación
- **THEN** se incluye por fecha de operación y se conserva su historia, incluyendo anulaciones identificadas

### Requirement: Dashboard coherente y sin pérdida de Inventario
Dashboard SHALL usar automáticamente el mes actual de Argentina sin selector, presentar su evolución y reutilizar la agregación financiera para cantidad e importe de cada fuente y resultado, preservando alertas reales de Inventario, umbral 3 y enlaces existentes.

#### Scenario: Misma selección temporal
- **WHEN** se consultan Dashboard y Finanzas para el mismo mes
- **THEN** los resúmenes financieros coinciden y las alertas de Inventario permanecen independientes

Refinamiento autorizado 11/11: Dashboard mantiene el mes actual; Por día/Por semana solo modifica el gráfico. Intervalos lunes-domingo recortados al mes; dos columnas Ingresos/Salidas con desglose en el detalle inferior y tooltip/tabla exactos. Evidencia en docs/features/FINANZAS.md.
