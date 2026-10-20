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

Auth: login válido/inválido, sesión expirada/manipulada, guard de comando directo, logout y persistencia. Con reloj controlado comprobar máximo absoluto de 30 días desde login, incluidos uso diario y solicitudes al límite: no se extiende, vencida exige login. Recovery de 1 hora: enlace válido antes del límite e inválido al vencer, token inválido/usado/concurrente, revocación de todas las sesiones previas, rollback y ausencia de auto-login. Si la contraseña nueva es rechazada antes de completar reset, comprobar enlace no consumido **si lo soporta la versión fijada de Better Auth**; registrar evidencia/limitación, no asumir garantía. Verificar comportamiento nativo de reemisión con dos enlaces y registrar decisión antes de cerrar recovery.

Aplicar la [matriz de errores Auth](../openspec/changes/implement-admin-auth-account/design.md#matriz-de-errores-y-conservación-segura): DB no disponible, fallo de correo con respuesta pública siempre neutra, contraseña actual incorrecta, sesión vencida al enviar sin efectos parciales, signup público rechazado y abuso limitado sin bloqueo indefinido. Probar campos seguros conservados y ausencia de contraseñas/tokens/URLs de recovery/SQL/stacks/secretos en errores y logs. Setup único, reintentos/concurrencia sin segunda cuenta ni alteración de la existente, sin contraseña en argumentos CLI ni salida. En cambio autenticado, otras sesiones siguen pendientes: no inventar resultado esperado ni cerrar ese subflujo antes de la decisión.

Resend/Cloudinary con dobles/fakes; no servicios, datos, correo o uploads productivos en tests. Imagen: fallos upload/BD/cleanup y conflicto concurrente conservan referencia válida. Finanzas R2: vigentes/anulados, fechaOperacion y fórmula, incluyendo vacío/cero/negativo.

RTL comprueba comportamiento de formularios y foco/errores/conservación de entradas donde aporte valor; no snapshots de clases o tests que repitan implementación. RSC async se verifica mediante integración/E2E apropiada.

Prerrequisitos del arnés: PostgreSQL aislado y limpieza protegida (guard de nombre/entorno); jsdom para los tests de componentes; browsers de Playwright instalados (`pnpm exec playwright install chromium`). El arnés, las versiones y los comandos están configurados y documentados en [DESARROLLO](DESARROLLO.md#pruebas); ver ADR-006.

## Pruebas E2E

Playwright contra Next real: login/protección/logout/reset, producto/imagen/publicación/ocultación/agotado, compra/anulación; Ventas/Finanzas al implementar R2. Metadata/HTML/OG/sitemap coherentes con visibilidad, navegación PC/mobile y teclado. En R3 probar tema persistente/SSR sin flash y que Home/catálogo/PDP no cambian. No declarar estos recorridos aprobados por build.

## Verificación complementaria

Revisar responsive, accesibilidad básica y objetivos de SEO cuando corresponda. Mantener los tests existentes funcionando. No desactivar pruebas para hacer pasar una entrega.

Cada bloque de tareas OpenSpec incluye sus tests/docs; no acumular toda la calidad al final. Existen `pnpm lint`, `pnpm typecheck`, `pnpm build` y el arnés `pnpm test`, `pnpm test:integration` y `pnpm test:e2e` (ver [DESARROLLO](DESARROLLO.md#pruebas)). Hoy las pruebas cubren infraestructura de base de datos, el guard de la base de pruebas, el formulario de acceso y un humo E2E de la página de login: **todavía no hay pruebas de las reglas de negocio** ni de autenticación real. Emi coordina scripts/arnés compartidos en R1; cada owner prueba su dominio. Evidencia manual histórica en MIGRACION_UI.md no prueba el negocio futuro. No marcar test PASS por este plan.
