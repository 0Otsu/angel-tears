# Finanzas y resumen operativo reales

## Why

RF-19 requiere consultar Compras y Egresos manuales por período como fuentes diferenciadas. RF-21 requiere un resultado económico de gestión con operaciones vigentes. Las fuentes ya existen, pero Finanzas todavía consume mocks y Dashboard solo muestra Inventario.

## What Changes

- Lectura administrativa autorizada y consistente de los resúmenes existentes de Ventas, Compras y Egresos; importes exactos y fecha de operación inclusiva.
- Finanzas con período mensual/rango personalizado, evolución persistida y consulta diferenciada de compras/egresos, incluyendo historia anulada sin contabilizarla.
- Indicadores reales en Dashboard mediante la misma agregación, preservando Inventario y tratando fallos parciales sin ceros ficticios.

## Impact

Solo consultas, presentación, pruebas y documentación. Sin migración ni cambios en registro/anulación de los módulos fuente. Desarrollo no se migra automáticamente. RF-16/CU-13 (gráfico propio de Ventas) permanece separado.
