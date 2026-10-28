# Tasks

## 1. P0: Producto compartido

- [ ] 1.1 Leer decisiones/gaps/ADR y acordar DTO con Claudio/Emi; registrar pendientes de validación sin inventar RF/CU.
- [x] 1.2 Crear schema único Producto/Categoria y categorías sembradas; probar slug único/estable, campos y migración en turno coordinado.
- [x] 1.3 Publicar consulta interna/DTO y fixtures de prueba del contrato; comprobar consumo por Compras/Inventario sin otro Product schema.
- [x] 1.4 Integrar alta oculta + saldo cero C0 en misma tx; probar rollback de ambos y documentar ownership.

Nota P0 local del 20/10/2026: [auditoría/evidencia](../../../docs/REVISION_LOCAL_P0.md). 1.3 verificada con consulta protegida, fixtures y consumidores de los contratos existentes; publicación solo en archivos de esta rama local, sin push. 1.1 no se marca: coordinación humana del DTO pendiente. 1.2 parcial: schema/semilla preparados, migración definitiva y pruebas SQL pendientes del turno Auth. 1.4 parcial: adaptador comparte tx y propaga fallos, pero falta C0 persistente y verificar rollback real de ambas tablas. No avanzar a tareas 2–5 en esta entrega.

Actualización del 22/10/2026: 1.2 verificada en el turno conjunto autorizado `0001_catalogo-proveedores-base` (Categoría/Producto de Augusto y Proveedor de Claudio). SQL/metadatos revisados; reconstrucción desde cero en PostgreSQL Docker, semilla idempotente y constraints/lectura/rollback de Producto comprobados con integración real. Evidencia en el plan de migración del diseño y `lib/modulos/productos/persistencia.integracion.test.ts`. 1.1 continúa pendiente de coordinación del DTO y 1.4 de C0 persistente y rollback conjunto con Inventario; no se avanzan tareas 2–5.

Actualización del 23/10/2026 — cierre técnico de 1.4: `0002_inventario-base` y C0 persistente están integrados en main desde `36d4b3b`. `insertarProductoOcultoConSaldo` pasa la misma tx del llamador a `crearContratoInventario(db).crearSaldoCero`, sin abrir/confirmar otra ni capturar sus fallos. Las pruebas PostgreSQL existentes de [Inventario](../../../lib/modulos/inventario/persistencia.integracion.test.ts), bloque «saldo cero junto al alta de Producto (C0)», usan ambos adaptadores reales y verifican creación con saldo 0/mínimo null y ausencia de ambas filas tras un fallo posterior al alta. La suite conjunta Producto + Inventario (27 pruebas) se volvió a ejecutar en esta revisión; la auditoría anterior también verificó las suites completas en PostgreSQL 17.10 y 18.4. No se duplican pruebas. Producto/Categoría y su adaptador siguen siendo de Augusto; Inventario, su schema y C0 siguen siendo de Claudio. Las notas del 20 y 22 son evidencia histórica, no bloqueos actuales de C0.

P0 queda técnicamente preparado: 1.2, 1.3 y 1.4 completas; 1.1 permanece abierta hasta confirmar humanamente el DTO con Claudio/Emi. No se declara P0 formalmente cerrado ni se inicia 2.x. El alta administrativa autorizada de extremo a extremo corresponde a 2.1, no a esta integración interna. Las tasks de Inventario conservan su estado para revisión de Claudio.

## 2. Productos e imagen

- [ ] 2.1 Implementar alta/consulta/edición con Zod y guard real; probar obligatorios/opcionales, precisión monetaria y precios históricos intactos; actualizar docs.

Evidencia de 2.1 del 28/10/2026: [implementación, pruebas y límites](../../../docs/features/PRODUCTOS_2_1.md). Alta/consulta/edición administrativa real conectada a PostgreSQL, guard existente y C0 persistente; precio de venta estrictamente mayor que cero por decisión humana expresa, decimal exacto sin redondeo, slug estable y control de versión. La UI mínima pertenece al alcance autorizado de 2.1; no cierra 2.5 ni incorpora imagen/publicación. La casilla 2.1 permanece abierta únicamente por la regresión de precios históricos: todavía no existen operaciones persistidas de Compras/Ventas con importes históricos; no se inventa infraestructura para simularla. 1.1 sigue pendiente de Emi (Claudio ya confirmó el DTO). Sin cambios en tareas de otros owners ni merge/push de esta entrega.

- [ ] 2.2 Implementar adapter/Handler de imagen con límites y validación real; probar no autorizado, tipo/tamaño/píxeles inválidos y guardar sin imagen oculto.
- [ ] 2.3 Implementar reemplazo con compensación/control de versión; probar fallos de upload/BD/cleanup y conservación de referencia anterior.
- [ ] 2.4 Implementar publicación/ocultación/destacado; probar imagen obligatoria al publicar y ausencia de eliminación física/ranking; documentar criterios.
- [ ] 2.5 Integrar formularios/listado/errores/confirmación accesibles; verificar con RTL estados/conservación de entradas donde aporte valor.

## 3. Público real

- [ ] 3.1 Implementar proyección autorizada con Inventario real y sin N+1; probar publicado/oculto/sin stock y ausencia de datos privados en DTO.
- [ ] 3.2 Conectar catálogo/PDP conservando URLs/visual; probar PDP agotada/Sin stock, oculto e inexistente 404 y fallo BD distinto de no encontrado.
- [ ] 3.3 Conectar Home destacados/categorías elegibles sin CMS; probar destacado agotado/oculto excluido y contactos/historias confirmados conservados.
- [ ] 3.4 Integrar consultas por solicitud y refresco postcommit; probar ocultar/agotar/reponer sin contenido persistentemente stale y documentar caché.

## 4. SEO, accesibilidad y rendimiento

- [ ] 4.1 Implementar metadata/canonical/OG por producto con lectura compartida; verificar HTML sin JS, imagen HTTPS y dominio validado, sin canonical localhost en producción.
- [ ] 4.2 Implementar Product/Offer y datos locales veraces; verificar ARS/disponibilidad y serialización segura, sin horarios/reviews/materiales inventados; actualizar trazabilidad.
- [ ] 4.3 Implementar sitemap/robots y reglas de indexación; probar publicadas agotadas incluidas, ocultos/admin/reset excluidos y guard independiente de robots.
- [ ] 4.4 Verificar responsive, teclado/foco/labels/alt/contraste, sizes/lazy/LCP y JS enviado; registrar medición y corregir defectos del slice sin rediseño global.

## 5. Integración y aceptación

- [ ] 5.1 Ejecutar E2E alta → imagen → publicar → compra/ajuste → Home/catálogo/PDP → agotar/ocultar/reponer con dependencias reales.
- [ ] 5.2 Ejecutar tests/lint/typecheck/build y OpenSpec estricto; actualizar mapa/docs y registrar dominio/contenido o RF/CU aún pendientes.
- [ ] 5.3 Integrar por [flujo Git vigente](../../../docs/GIT_WORKFLOW.md), coordinando contratos/archivos con owners sin PR/aprobación cruzada obligatorios; revisión adicional recomendable. Ninguna task se marca por el solo hecho de planificar y no se archiva antes de aceptación técnica con evidencia.

## Workflow follow-up

- Search Console/GBP y aceptación productiva dependen de entorno autorizado; no crear módulos o changes futuros activos en esta preparación.
