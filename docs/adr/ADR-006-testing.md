# ADR-006: Vitest, React Testing Library y Playwright

**Estado: ACEPTADO — 19/10/2026**, stack aprobado expresamente. No se instalan ni se crean suites en esta entrega.

## Contexto y alternativas

Los comandos actuales lint/typecheck/build no prueban negocio. No se reabre la selección aprobada ni se exige cobertura del 100%. Mocks de SQL y SQLite no sustituyen PostgreSQL para transacciones, constraints y concurrencia.

## Decisión

- Vitest: dinero exacto, reglas puras y casos de uso; integración contra PostgreSQL de prueba aislado, con migraciones reales y escenarios de rollback/contención.
- React Testing Library: conducta observable de formularios, validación, conservación de entradas y foco cuando aporta valor. No snapshots de clases del template ni renderizar Server Components async como si fueran cliente.
- Playwright: navegador contra Next real y BD/servicios de prueba; público, login, sesiones, reset, producto/imagen/stock y operaciones críticas. Dobles de Resend/Cloudinary en pruebas, sin enviar mensajes o subir recursos comerciales.
- Cada bloque de implementación incorpora sus pruebas y documentación; no acumular testing al final de la ronda. Vitest/RTL por módulo, E2E por recorrido e integración transversal al final.
- Los próximos cambios crearán scripts explícitos `test`, `test:integration`, `test:e2e`; hoy **no existen**, no inventar un PASS ni instalar herramientas para completar este blueprint.

## Consecuencias

Emi coordina el arnés compartido; Augusto y Claudio son responsables de pruebas de sus slices. BD de prueba con guard de nombre/entorno para no limpiar datos reales, limpieza y fixtures deterministas. Ver [TESTING](../TESTING.md) para matriz concreta y comandos actuales.

Fuentes: [Vitest](https://vitest.dev/guide/), [RTL](https://testing-library.com/docs/react-testing-library/intro/), [Playwright](https://playwright.dev/docs/intro). Consultadas el 19/10/2026.
