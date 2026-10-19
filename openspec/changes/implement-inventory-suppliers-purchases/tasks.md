# Tasks

## 1. Contratos y C0

- [ ] 1.1 Revisar blueprint/gaps con E0/P0 y confirmar archivos propios; documentar dependencias y pendientes sin otro Producto.
- [ ] 1.2 Definir crearSaldoCero/aplicarMovimientos/consultarDisponibilidad y sus dobles de prueba; comprobar compilación de consumidores acordados.
- [ ] 1.3 Implementar Inventario/schema y saldo cero junto a alta Producto con tx común; probar fallo de alta sin huérfanos y documentar contrato.
- [ ] 1.4 Integrar migración en turno con Emi y P0; verificar PostgreSQL aislado y ausencia de journals reescritos.

## 2. Stock, mínimos y ajustes

- [ ] 2.1 Implementar consulta saldo/mínimo/stock bajo <=; probar null, cero, igualdad y saldo agotado, y documentar estados.
- [ ] 2.2 Implementar cambio de mínimo con validación/permisos; probar quitar mínimo, valores inválidos y conservación de saldo.
- [ ] 2.3 Implementar ajustes y saldo inicial identificados con motivo, actor/historia y deduplicación; probar decremento insuficiente y ausencia de compra/efecto económico.
- [ ] 2.4 Implementar locks/movimientos/reversas del contrato; probar concurrencia, rollback, misma clave/mismo payload y misma clave/payload diferente.
- [ ] 2.5 Integrar UI Stock/historia autorizada; verificar error/vacío/foco y que el saldo nunca se sustituye sin registro; actualizar evidencia.

## 3. Proveedores

- [ ] 3.1 Implementar alta/consulta/modificación con nombre obligatorio y contactos opcionales; probar permisos/formato y documentar campos reales.
- [ ] 3.2 Implementar inactivación y exclusión en selección nueva sin perder historia; probar cambio de nombre/histórico y no exponer baja no aprobada.
- [ ] 3.3 Integrar listado/formulario/vacíos/errores accesibles; verificar comportamiento con RTL donde aporte y actualizar trazabilidad provisional.

## 4. Compras

- [ ] 4.1 Implementar cabecera/líneas/snapshots/fecha real y carga; probar múltiples líneas/importes exactos/proveedor opcional y documentar DTO.
- [ ] 4.2 Confirmar compra en tx común con stock/movimientos/idempotencia; probar incremento único, fallo intermedio y reintento después de respuesta perdida.
- [ ] 4.3 Implementar anulación completa bajo locks y estado; probar doble anulación y reversión bloqueada sin negativo ni efecto parcial.
- [ ] 4.4 Probar anulación concurrente con decremento de stock y orden de locks; verificar invariantes reales de PostgreSQL y registrar evidencia.
- [ ] 4.5 Integrar formulario/consulta/anulación sin edición de confirmadas; probar conservación de contexto, error de reversión y accesibilidad; documentar el flujo.

## 5. Integración

- [ ] 5.1 Ejecutar E2E Producto → stock inicial/compra → consulta → anulación con Auth real, sin UI pública nueva.
- [ ] 5.2 Ejecutar tests/lint/typecheck/build y OpenSpec estricto; actualizar mapa/docs con evidencia y pendientes académicos.
- [ ] 5.3 Verificar contrato listo para Ventas R2 sin implementarlas; integrar por flujo Git normal, sin marcar tareas por planificación.

## Workflow follow-up

- Sincronizar y archivar tras aceptación técnica con evidencia según el [workflow vigente](../../../docs/GIT_WORKFLOW.md), sin PR/aprobación cruzada obligatorios; revisión adicional recomendable. Nunca en esta preparación.
