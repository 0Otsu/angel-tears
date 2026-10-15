# ADR-002: propuesta de Next.js full-stack

**Estado: PROPUESTO - PENDIENTE DE VALIDACIÓN DEL EQUIPO**

## Contexto

El MVP combina sitio público con SEO/indexabilidad y administración. La dirección inicial es un monolito modular. Se propone evaluar Next.js full-stack, TypeScript y PostgreSQL; aún no se validaron grupalmente ni se instalaron.

## Alternativas

| Criterio | React SPA + backend separado | Next.js full-stack |
| --- | --- | --- |
| SEO | Evaluar cómo entregar contenido público rastreable e indexable; una SPA no resuelve por sí sola todos los objetivos. | Evaluar las opciones de entrega de contenido público para cumplir SEO; no garantiza resultados por sí solo. |
| Simplicidad operativa | Requiere coordinar frontend, backend y sus contratos/configuración. | Puede concentrar interfaz y lógica de servidor en una aplicación, cuidando límites internos. |
| Única aplicación | Evaluar si la separación elegida se ajusta a la dirección de una aplicación o requiere revisarla. | Se alinea con la propuesta de monolito modular full-stack. |
| Experiencia del equipo | Contrastar conocimientos reales de React, backend y coordinación entre componentes. | Contrastar conocimientos reales de Next.js, TypeScript y trabajo del lado servidor. |
| Mantenibilidad | Límites explícitos por API, con coordinación de cambios entre componentes. | Menos separación operativa, pero exige disciplina para no mezclar dominio e interfaz. |
| Deployment | Evaluar operación y despliegue de frontend y backend separados. | Evaluar un despliegue full-stack compatible con las necesidades; hosting aún pendiente. |

Esta comparación expresa criterios para evaluar, no mediciones ni garantías de rendimiento, costo o facilidad. No se presupone experiencia concreta del equipo.

## Decisión propuesta

Evaluar **Next.js full-stack + TypeScript + PostgreSQL** para una aplicación monolítica modular full-stack. **No es una decisión definitiva.** El equipo debe comparar alternativas y validar la propuesta antes de adoptarla y hacer bootstrap.

## Razones a considerar

SEO/indexabilidad, simplicidad operativa, una única aplicación, experiencia real del equipo, mantenibilidad y deployment. La selección debe atender requisitos y capacidad del equipo, sin elegir tecnologías solo por sugerencia de IA.

## Consecuencias si se acepta

Habrá que definir límites del dominio, persistencia y acceso al servidor, y documentar herramientas complementarias mediante ADR. ORM, autenticación, validación, CSS/UI, imágenes, hosting, error tracking, analytics y CI definitivo siguen pendientes.

Mientras no se valide, no instalar Next.js ni paquetes, crear código de producción o presentar TypeScript/PostgreSQL como decisiones cerradas.
