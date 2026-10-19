# Estrategia de testing

Stack aprobado expresamente el 19/10/2026: Vitest, React Testing Library y Playwright, [ADR-006](adr/ADR-006-testing.md). No se instalan ni implementan pruebas en esta preparación. No exigir 100% de cobertura: priorizar riesgos e invariantes; SRS/RUP canónicos y criterios pendientes se mantienen explícitos.

## Pruebas unitarias y de dominio

| Área | Casos críticos esperados |
| --- | --- |
| Stock | Nunca negativo; mínimo opcional/null distinto de cero; alerta `<=`; ajustes con motivo/historia y carga inicial sin efecto económico; reintentos sin duplicación. |
| Producto/público | Imagen obligatoria al publicar, oculto no listado y 404 directo; agotado fuera de listados pero PDP disponible; slug estable, destacado elegible y ausencia de privados. |
| Compras | Confirmación aumenta stock; conserva importes históricos; operación completa o sin efecto; importe contado una sola vez. |
| Ventas | Stock suficiente para confirmar; insuficiente rechaza sin modificar stock; conserva precios históricos; producto oculto vendible con stock. |
| Anulaciones | Compra revierte una sola vez y se bloquea si dejaría stock negativo; venta reintegra una sola vez; egreso anulado excluido de resultados. |
| Resultado económico | Ventas vigentes menos compras vigentes menos egresos manuales vigentes; compras sin doble conteo; historial conservado. |

## Pruebas de integración

Vitest prueba dominio/casos de uso y, contra PostgreSQL aislado, importes exactos/historia, locks/rollback, autorización y consultas coherentes. Probar dos decrementos de última unidad, anular compra con venta/ajuste concurrente, doble anulación y misma clave de solicitud repetida/diferente payload. Dobles/SQLite no prueban estas garantías. Ronda 1 agrega arnés con migraciones y guard de entorno para no limpiar BD real.

Auth: login válido/inválido, sesión expirada/manipulada, guard de comando directo, logout, persistencia, reset token inválido/vencido/usado/concurrente, revocación global y rollback. Resend/Cloudinary con dobles; no correo/upload comercial en tests. Imagen: fallos upload/BD/cleanup y conflicto concurrente conservan referencia válida. Finanzas R2: vigentes/anulados, fechaOperacion y fórmula, incluyendo vacío/cero/negativo.

RTL comprueba comportamiento de formularios y foco/errores/conservación de entradas donde aporte valor; no snapshots de clases o tests que repitan implementación. RSC async se verifica mediante integración/E2E apropiada.

## Pruebas E2E

Playwright contra Next real: login/protección/logout/reset, producto/imagen/publicación/ocultación/agotado, compra/anulación; Ventas/Finanzas al implementar R2. Metadata/HTML/OG/sitemap coherentes con visibilidad, navegación PC/mobile y teclado. En R3 probar tema persistente/SSR sin flash y que Home/catálogo/PDP no cambian. No declarar estos recorridos aprobados por build.

## Verificación complementaria

Revisar responsive, accesibilidad básica y objetivos de SEO cuando corresponda. Mantener los tests existentes funcionando. No desactivar pruebas para hacer pasar una entrega.

Cada bloque de tareas OpenSpec incluye sus tests/docs; no acumular toda la calidad al final. Actualmente existen `pnpm lint`, `pnpm typecheck` y `pnpm build`; **no existe script test**, ni arnés/suite funcional. Emi coordina scripts/arnés compartidos en R1; cada owner prueba su dominio. Evidencia manual histórica en MIGRACION_UI.md no prueba el negocio futuro. No usar un comando inexistente ni marcar test PASS por este plan.
