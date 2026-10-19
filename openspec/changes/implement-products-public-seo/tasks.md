# Tasks

## 1. P0: Producto compartido

- [ ] 1.1 Leer decisiones/gaps/ADR y acordar DTO con Claudio/Emi; registrar pendientes de validación sin inventar RF/CU.
- [ ] 1.2 Crear schema único Producto/Categoria y categorías sembradas; probar slug único/estable, campos y migración en turno coordinado.
- [ ] 1.3 Publicar consulta interna/DTO y fixtures de prueba del contrato; comprobar consumo por Compras/Inventario sin otro Product schema.
- [ ] 1.4 Integrar alta oculta + saldo cero C0 en misma tx; probar rollback de ambos y documentar ownership.

## 2. Productos e imagen

- [ ] 2.1 Implementar alta/consulta/edición con Zod y guard real; probar obligatorios/opcionales, precisión monetaria y precios históricos intactos; actualizar docs.
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
- [ ] 5.3 Integrar por flujo Git normal y revisar con owners; ninguna task se marca por el solo hecho de planificar y no se archiva antes de aceptación.

## Workflow follow-up

- Search Console/GBP y aceptación productiva dependen de entorno autorizado; no crear módulos o changes futuros activos en esta preparación.
