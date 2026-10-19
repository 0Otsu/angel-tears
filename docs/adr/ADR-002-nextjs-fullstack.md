# ADR-002: Next.js full-stack, TypeScript y PostgreSQL

**Estado: ACEPTADO**

Aceptación humana explícita: 16/10/2026, tarea UI FOUNDATION + APPLICATION BOOTSTRAP. Esta decisión sustituye el estado propuesto anterior; no implica que las integraciones futuras estén implementadas.

## Contexto

Angel Tears combina un sitio público con requisito de indexabilidad y administración interna para un negocio pequeño. La dirección aprobada es un monolito modular. Existe una UI revisada exportada desde v0 y adaptada sobre Boty; se necesita comenzar la aplicación sin rediseñarla y mantener una operación comprensible para el MVP.

## Alternativas consideradas

| Criterio | React SPA + backend separado | Next.js full-stack |
| --- | --- | --- |
| Público indexable | Requiere resolver entrega de HTML público y coordinarla con la SPA. | Permite prerenderizado o renderizado de servidor según el contenido. |
| Operación | Frontend y backend con configuración y contratos coordinados. | Una aplicación para público, administración y servidor. |
| Mantenibilidad | Límites por API; mayor coordinación operativa inicial. | Límites internos por dominio sin distribuir el sistema. |
| UI existente | Requiere adaptar las convenciones del export. | Compatible con la UI revisada de v0/Next, con limpieza de código exportado. |

Son compromisos cualitativos, no garantías de SEO, rendimiento, costos ni experiencia del equipo.

## Decisión

Adoptar **Next.js full-stack + TypeScript + PostgreSQL** en una arquitectura monolítica modular: una aplicación y una base de datos. Tailwind se conserva como base visual de la UI aprobada. PostgreSQL es la persistencia elegida y **todavía no se conecta**.

## Razones

- El sitio público requiere indexabilidad y una entrega de HTML adecuada para su contenido.
- Next permite elegir renderizado/prerenderizado adecuado sin convertir SEO en una garantía automática.
- Público y administración pertenecen a una sola aplicación del MVP.
- La integración entre frontend y servidor reduce coordinación entre proyectos separados.
- Menor complejidad operativa para este negocio y esta etapa del MVP.
- Compatibilidad con la UI exportada desde v0 y revisada: evita un traslado visual innecesario, pero **no es la única razón de la elección**.
- TypeScript en todo el proyecto permite contratos y comprobaciones comunes.
- La aplicación puede evolucionar por módulos y vertical slices sin requerir microservicios.

## Consecuencias y límites

La primera entrega contiene UI y mocks: no hay API/Server Actions de negocio, persistencia, sesiones ni CRUD real. El detalle público se prerenderiza desde fixtures; los datos no fijan disponibilidad real. No se crean módulos de dominio vacíos.

ORM/acceso a datos, autenticación, validación, framework de testing, almacenamiento de imágenes, hosting, error tracking, analytics y CI definitivo siguen pendientes de decisiones posteriores. No se instala ninguna de esas soluciones por inferencia.

El servidor deberá aplicar autorización, validación y transacciones cuando se implementen los casos de negocio. La navegación mock actual no satisface esos requisitos. El equipo todavía debe incorporar SRS/RUP validados, completar trazabilidad y revisar el PR antes del merge.

Versiones efectivas, dependencias, limpieza y evidencia del bootstrap: [MIGRACION_UI.md](../MIGRACION_UI.md).

**Actualización de vigencia, 19/10/2026:** los pendientes de herramientas del registro anterior se resuelven en ADR-003..008 por aprobación/autorización expresa del responsable. Ver [índice](README.md) y [blueprint](../BLUEPRINT_IMPLEMENTACION_MVP.md); la arquitectura base de este ADR no cambia ni se da por implementada la integración.
