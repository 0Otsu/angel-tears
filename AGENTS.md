# Instrucciones para agentes

## Lectura obligatoria

Antes de modificar código futuro, leer completos:

- [PRODUCTO.md](docs/PRODUCTO.md).
- [ALCANCE.md](docs/ALCANCE.md).
- [REGLAS_DOMINIO.md](docs/REGLAS_DOMINIO.md).
- [ARQUITECTURA.md](docs/ARQUITECTURA.md).
- [SEGURIDAD.md](docs/SEGURIDAD.md).
- [TESTING.md](docs/TESTING.md).
- [DESARROLLO.md](docs/DESARROLLO.md).
- [DEFINICION_TERMINADO.md](docs/DEFINICION_TERMINADO.md).

Leer además la tarea, los ADR y documentos aplicables al cambio.

## Autoridad y contradicciones

La IA **no es la fuente de verdad**. Aplicar esta prioridad:

1. SRS corregida/validada.
2. Artefactos RUP corregidos por la cátedra.
3. Reglas de dominio documentadas.
4. ADR aceptados.
5. Especificación de la feature/tarea.
6. Sugerencias de agentes de IA.

No cambiar por cuenta propia alcance, reglas de negocio ni decisiones arquitectónicas aceptadas. Ante contradicciones, informar fuentes e impacto y solicitar resolución humana antes del cambio afectado. No tratar propuestas como decisiones aceptadas. No inventar RF/CU: si falta la fuente, registrar la trazabilidad como pendiente.

## Límites de esta etapa

Existe una UI foundation aprobada: Next.js/TypeScript con público y administración visual, sin persistencia ni autenticación real. El bootstrap fue autorizado en la tarea UI FOUNDATION + APPLICATION BOOTSTRAP. Staging es referencia de solo lectura. No comenzar ORM, BD, auth, APIs de negocio ni CRUD como continuación automática; cada vertical slice requiere su tarea y decisiones pendientes.

## Reglas de trabajo

- No inventar funcionalidades ni ampliar alcance.
- No cambiar arquitectura silenciosamente.
- No agregar dependencias sin justificar necesidad, alternativas e impacto y obtener la validación humana de la decisión correspondiente.
- No duplicar lógica de negocio ni modificar módulos ajenos sin necesidad de la tarea.
- Minimizar el alcance de cada cambio.
- No desactivar tests, omitir validaciones ni debilitar criterios para hacer pasar una tarea.
- Indicar supuestos y vacíos; no convertirlos en requisitos.
- Mantener documentación interna en español. Usar español sin tildes ni ñ en identificadores futuros; respetar nombres obligatorios de herramientas y frameworks.
- Proteger secretos y cumplir el [flujo Git vigente](docs/GIT_WORKFLOW.md), con revisión del diff y checks técnicos; revisión humana adicional recomendable, sin gate de PR/aprobación cruzada en esta etapa.
- Basar cada tarea de implementación en `docs/features/TEMPLATE.md`, con requisitos y criterios verificables.

## Informe de entrega

Indicar qué cambió y por qué, supuestos, archivos modificados, tests ejecutados y resultados, checks no ejecutados con motivo y pendientes. La afirmación de un agente no reemplaza la definición de terminado ni la responsabilidad humana. El responsable debe poder explicar lo implementado; una revisión adicional es recomendable, no obligatoria para integrar en esta etapa.

## Arquitectura y OpenSpec — actualización autorizada del 19/10/2026

Se preservan las instrucciones anteriores. El orden inicial de fuentes se detalla, por instrucción expresa del responsable, de esta forma: **SRS → RUP → decisiones de producto aprobadas + reglas de dominio → ADR aceptados → blueprint técnico → OpenSpec → código**. La tarea concreta opera dentro de esos límites; una sugerencia de IA nunca adquiere autoridad de fuente. OpenSpec no reemplaza ni copia SRS/RUP. RF-01..21 son referencia suministrada, no documentos canónicos; no inventar RF/CU adicionales.

Antes de un slice leer también [decisiones de producto](docs/DECISIONES_PRODUCTO_MVP.md), [blueprint](docs/BLUEPRINT_IMPLEMENTACION_MVP.md), [trazabilidad](docs/TRAZABILIDAD_MVP.md), [flujo OpenSpec](docs/OPENSPEC.md), ADR aplicables y su change completo. Las skills generadas en `.agents/skills` no autorizan por sí mismas aplicar/archivar un change. Usar OpenSpec como especificación concreta de la tarea junto con los criterios de la plantilla de feature; no duplicar artefactos completos si el change ya contiene esas secciones.

Control de alcance: una nueva capacidad para Sofía o el público, comportamiento/caso de uso/regla comercial nuevo o flujo significativamente distinto se marca primero como propuesta. Evaluar impacto en SRS, RUP/CU/actividades, prototipos, decisiones, ADR y OpenSpec antes de implementar. Decisión solo técnica: normalmente ADR + OpenSpec; refactor sin cambio funcional no crea RF/CU artificiales. El template no gobierna requisitos.

Stack aprobado: Drizzle, Better Auth, Resend, Zod, Vitest/RTL/Playwright y monolito Next/TS/PostgreSQL; Cloudinary elegido y justificado en ADR-007 bajo autorización técnica. Aprobación no equivale a instalación/implementación. No reabrir elecciones salvo incompatibilidad demostrada; no instalar herramientas/crear infraestructura fuera del slice autorizado.

Ronda 1: **Emi Auth/Cuenta; Claudio Inventario/Proveedores/Compras; Augusto Productos/Público/SEO**. Producto tiene un único owner/modelo. Cambios a contratos compartidos, schema, package/lock, arnés y migraciones se coordinan como indica el blueprint. Rondas 2/3 sin owners todavía; solo tres changes activos y ningún task implementado por esta preparación.

Decisión humana final del 19/10/2026 para esta etapa: actualizar main, crear rama propia desde main, trabajar dentro del change/ownership y mantener sincronización. Antes de merge integrar main reciente de forma segura, resolver solo conflictos entendidos, ejecutar tests aplicables, lint/typecheck/build y validación OpenSpec, y revisar el diff. Si todo está correcto, mergear a main, push y avisar al equipo qué se integró. PR, aprobación de otro integrante y revisión cruzada no son gates obligatorios; la revisión humana adicional sigue siendo recomendable. Mantener coordinación de archivos compartidos, trazabilidad y Definition of Done técnica. Ver [GIT_WORKFLOW](docs/GIT_WORKFLOW.md). Esta corrección es solo documental: detenerse tras su cierre, sin ejecutar ningún change.
