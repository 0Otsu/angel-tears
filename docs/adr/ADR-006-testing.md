# ADR-006: Estrategia y herramientas de testing

**Estado: ACEPTADO**

Aceptación humana explícita: 19/10/2026, indicada por el equipo del proyecto (decisión del responsable). La revisión del PR que incorpora este ADR sigue pendiente.

## Contexto

[TESTING.md](../TESTING.md) define qué debe probarse (dominio, integración con base de datos, E2E, verificación complementaria) pero deja sin elegir el framework. Hoy solo existen `pnpm lint`, `pnpm typecheck` y `pnpm build`, más revisión manual. No hay suite funcional, y el build exitoso no prueba autenticación, stock ni transacciones.

## Alternativas

La elección la tomó el responsable del proyecto. Esta documentación no evaluó alternativas en detalle. Entre las habituales están Jest, Cypress o Testing Library con otro runner.

## Decisión

| Herramienta | Uso |
| --- | --- |
| **Vitest** | Pruebas unitarias y de dominio. Pruebas de integración donde corresponda, incluidas las que usan PostgreSQL real. |
| **React Testing Library** | Comportamiento de componentes y formularios desde la perspectiva de la persona usuaria. |
| **Playwright** | Pruebas E2E de flujos completos en navegador. |

Los nombres de scripts (por ejemplo `pnpm test` o `pnpm test:e2e`) y la estructura de carpetas se fijan en la tarea de implementación.

## Qué se espera probar primero: autenticación

Pruebas futuras **obligatorias** para el slice de autenticación ([feature AUTENTICACION](../features/AUTENTICACION.md)):

- login correcto;
- login incorrecto;
- protección de `/admin` sin sesión;
- sesión persistente;
- logout;
- recuperación de contraseña (respuesta neutra);
- token inválido;
- token vencido;
- cambio de contraseña autenticado;
- invalidación de sesiones anteriores tras el restablecimiento.

El feature agrega otros casos negativos (por ejemplo, que no exista registro público y que el token no se pueda reutilizar).

## Razones

- Cubren los tres niveles que pide TESTING.md con tres herramientas con responsabilidades distintas.
- Probar contra PostgreSQL real, y no con la base simulada, es lo que TESTING.md pide para transacciones, rollback y concurrencia.
- Las pruebas de autenticación y de rechazo de acceso sin permiso deben ejecutarse de punta a punta, donde Playwright aporta más que una prueba de componentes.

## Consecuencias

- **No se busca cobertura del 100%.** Se priorizan riesgos e invariantes del dominio. No se escriben tests que solo replican la implementación, no se desactivan pruebas para aprobar una entrega y los tests existentes deben seguir pasando.
- **Versiones verificadas en npm el 19/10/2026** (se fijan versiones exactas al instalar): `vitest` 5.0.5 (requiere Node `^22.12 || ^24 || >=26`; el repo usa 24.15), `@testing-library/react` 16.3.3 y `@playwright/test` 1.64.1. Sin incompatibilidades objetivas con Next 16.0.10 ni React 19.2.0.
- Hay dependencias adicionales a justificar en la tarea: un entorno de DOM para Vitest (`jsdom` o `happy-dom`), `@testing-library/dom` (dependencia de par de Testing Library), `@testing-library/user-event` si se usa, y la descarga de navegadores de Playwright. `@types/node` 22.20.5 es compatible con Vitest.
- Las pruebas de integración y E2E necesitan una base PostgreSQL de pruebas, aislada de cualquier dato real, con limpieza reproducible. Cómo se levanta (instalación local, contenedor u otra) se decide en la tarea. No fuerza una decisión de hosting.
- Pruebas que envían correo usarán un reemplazo controlado del envío; nunca el servicio real de Resend ni datos reales.
- **CI definitivo sigue pendiente.** Los tests deben poder ejecutarse localmente; integrarlos en un pipeline es otra decisión.
- Cada tarea debe indicar pruebas esperadas, comandos ejecutados, resultados y limitaciones ([DEFINICION_TERMINADO](../DEFINICION_TERMINADO.md)).
- Cambiar esta decisión requiere un ADR que la reemplace.
