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
| [ADR-003: Drizzle, modelo y transacciones](ADR-003-drizzle-modelo-transacciones.md) | ACEPTADO 19/10/2026 |
| [ADR-004: Better Auth y Resend](ADR-004-better-auth-resend.md) | ACEPTADO 19/10/2026 |
| [ADR-005: Zod](ADR-005-zod-validacion.md) | ACEPTADO 19/10/2026 |
| [ADR-006: testing](ADR-006-testing.md) | ACEPTADO 19/10/2026 |
| [ADR-007: Cloudinary](ADR-007-cloudinary-imagenes.md) | ACEPTADO 19/10/2026, autorización técnica |
| [ADR-008: fronteras Next.js](ADR-008-nextjs-fronteras.md) | ACEPTADO 19/10/2026, autorización técnica |

Monolito/Next/TS/PostgreSQL aceptados el 16/10/2026; UI Foundation y cierre documental integrados. El 19/10 el responsable aprueba expresamente el stack complementario y autoriza elegir decisiones técnicas necesarias del blueprint, incluida Cloudinary. Son decisiones de arquitectura, no instalación ni implementación. Los ADR-001/002 conservan su registro histórico; los complementarios resuelven los pendientes técnicos de aquella etapa, sin modificar SRS/RUP.
