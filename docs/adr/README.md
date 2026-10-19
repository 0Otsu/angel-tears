# Registro de decisiones arquitectónicas (ADR)

Un ADR documenta una decisión técnica relevante: contexto, alternativas, decisión, razones y consecuencias. Permite entender por qué se eligió un camino y qué compromisos implica.

Usarlo al evaluar arquitectura, stack, persistencia, autenticación, validación, UI, imágenes, hosting, observabilidad, seguimiento o CI; también para cambiar una decisión previamente aceptada. No hace falta un ADR para cada cambio rutinario.

## Proceso

1. Crear un archivo numerado con título descriptivo, estado, contexto, alternativas, decisión, razones y consecuencias.
2. Marcarlo como propuesto mientras se evalúa; exponer preguntas y criterios.
3. Registrar validación humana del equipo y fecha cuando ocurra. Un agente no puede aceptar por su cuenta una decisión.
4. Si cambia una decisión aceptada, crear un ADR que la reemplace y enlazar ambos; mantener la historia y actualizar los documentos relacionados.

Los ADR no pueden contradecir unilateralmente la SRS validada, los artefactos RUP corregidos ni las reglas del dominio.

## Índice y estados vigentes

| ADR | Estado |
| --- | --- |
| [ADR-001: monolito modular](ADR-001-monolito-modular.md) | ACEPTADO |
| [ADR-002: Next.js full-stack](ADR-002-nextjs-fullstack.md) | ACEPTADO |
| [ADR-003: Drizzle ORM](ADR-003-drizzle-orm.md) | ACEPTADO |
| [ADR-004: Better Auth (incluye Resend para recuperación y cuenta inicial)](ADR-004-better-auth.md) | ACEPTADO |
| [ADR-005: Zod para validación](ADR-005-zod-validacion.md) | ACEPTADO |
| [ADR-006: Testing (Vitest, React Testing Library, Playwright)](ADR-006-testing.md) | ACEPTADO |

Monolito modular y Next.js/TypeScript/PostgreSQL aceptados por autorización humana del 16/10/2026. La revisión del PR sigue pendiente; herramientas complementarias no se consideran aceptadas por asociación.

ADR-003 a ADR-006 documentan decisiones tecnológicas aceptadas por indicación humana del equipo del proyecto el 19/10/2026 (decisión del responsable). La revisión del PR que los incorpora sigue pendiente.
