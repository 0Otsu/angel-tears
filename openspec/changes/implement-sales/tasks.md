# Tasks

## 1. Contratos y reglas

- [ ] 1.1 Revisar fuentes y gaps; acordar con Claudio el origen VENTA, las reversas del contrato y el orden de migraciones; documentar lo acordado y los pendientes sin tocar su módulo antes.
- [ ] 1.2 Definir el contrato de Ventas y los puertos de Inventario y Productos con sus dobles de prueba; comprobar que compilan contra los contratos vigentes.
- [ ] 1.3 Implementar reglas puras (validación de líneas, consolidación por producto, total en centavos, Consumidor Final) y su clasificación de solicitud; probar importes exactos, precisión excedida y cantidades inválidas.

## 2. Persistencia

- [ ] 2.1 Implementar el schema `venta.ts` y su migración coordinada; probar constraints (línea única por número, cantidad positiva, estado válido) y que no se reescriben migraciones aplicadas.
- [ ] 2.2 Ampliar `movimiento_stock` y el contrato de Inventario con origen VENTA, reutilizando las reversas que Claudio ya integró (`reversaDe` y `consultarMovimientosDeOrigen`); probar el CHECK de origen único y que cada reversa sea única.

## 3. Registrar venta

- [ ] 3.1 Implementar el registro multilínea con precio y nombre históricos, fecha real y de carga; probar producto oculto con stock y cambio posterior de precio sin alterar la venta.
- [ ] 3.2 Confirmar en transacción única con stock, movimientos e idempotencia; probar stock insuficiente sin efectos, fallo intermedio y repetición después de respuesta perdida.
- [ ] 3.3 Probar concurrencia real: dos ventas de la última unidad confirman solo una, y la misma clave con otro contenido se rechaza como conflicto.

## 4. Consultar y anular

- [ ] 4.1 Implementar consulta y detalle con filtros por fecha de operación y estado; probar estados vacío, error y Consumidor Final.
- [ ] 4.2 Implementar anulación con reintegro bajo locks y estado; probar doble anulación, reintegro único y conservación de la historia.
- [ ] 4.3 Probar anulación concurrente con una venta nueva sobre el mismo producto y el orden de locks; registrar evidencia.

## 5. Interfaz

- [ ] 5.1 Reemplazar la muestra de `/admin/ventas` por el formulario multilínea con selector de productos internos; probar que conserva las cantidades ante error de stock y es accesible.
- [ ] 5.2 Integrar listado, detalle y anulación sin edición de confirmadas; verificar guardia de sesión, refresco de productos afectados después del commit y accesibilidad.

## 6. Integración

- [ ] 6.1 Ejecutar E2E Producto con stock → venta → consulta → anulación con Auth real, sin UI pública nueva.
- [ ] 6.2 Ejecutar tests, lint, typecheck, build y OpenSpec estricto; actualizar mapa, docs y bitácora con evidencia y pendientes; actualizar AGENTS.md y `config.yaml` si el change se acepta.
- [ ] 6.3 Integrar por el flujo Git vigente, avisar al equipo y pasar a Review; sin marcar tareas por planificación.

## Workflow follow-up

- Sincronizar y archivar tras aceptación técnica con evidencia según el [workflow vigente](../../../docs/GIT_WORKFLOW.md), sin PR ni aprobación cruzada obligatorios; revisión adicional recomendable. Nunca en esta planificación.
