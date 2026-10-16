# Estrategia de testing propuesta

La estrategia debe validarse junto con la arquitectura y los requisitos. No se elige todavía un framework de pruebas ni se instala ninguna herramienta. No exigir cobertura del 100%: priorizar riesgos e invariantes del dominio.

## Pruebas unitarias y de dominio

| Área | Casos críticos esperados |
| --- | --- |
| Stock | Nunca negativo; mínimo opcional; productos sin mínimo excluidos de stock bajo. Comparación del umbral pendiente. |
| Compras | Confirmación aumenta stock; conserva importes históricos; operación completa o sin efecto; importe contado una sola vez. |
| Ventas | Stock suficiente para confirmar; insuficiente rechaza sin modificar stock; conserva precios históricos; producto oculto vendible con stock. |
| Anulaciones | Compra revierte una sola vez y se bloquea si dejaría stock negativo; venta reintegra una sola vez; egreso anulado excluido de resultados. |
| Resultado económico | Ventas vigentes menos compras vigentes menos egresos manuales vigentes; compras sin doble conteo; historial conservado. |

## Pruebas de integración

Probar lógica y base de datos en conjunto: persistencia de importes históricos, transacciones, rollback ante fallos, autorización en servidor y consultas coherentes. Incluir operaciones simultáneas que puedan comprometer stock o duplicar una reversión, una vez elegida la estrategia de persistencia.

## Pruebas E2E

Cubrir flujos críticos: login, productos, compra, venta y anulaciones. Verificar rechazo de acceso administrativo sin autorización. Los pasos concretos y datos de prueba se definirán según los criterios de cada feature.

## Verificación complementaria

Revisar responsive, accesibilidad básica y objetivos de SEO cuando corresponda. Mantener los tests existentes funcionando. No desactivar pruebas para hacer pasar una entrega.

Cada tarea debe indicar pruebas esperadas, comandos ejecutados, resultados y limitaciones. Los comandos se documentarán cuando se elijan herramientas; la UI foundation tiene `pnpm lint`, `pnpm typecheck` y `pnpm build`. La revisión responsive, rutas y mocks es manual; la evidencia está descrita en MIGRACION_UI.md. No se instaló un framework de testing ni se consideran probadas las reglas futuras de dominio.
