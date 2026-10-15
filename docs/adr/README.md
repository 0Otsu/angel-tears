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
| [ADR-001: monolito modular](ADR-001-monolito-modular.md) | ACEPTADO COMO DIRECCIÓN INICIAL - PENDIENTE DE REVISIÓN DEL EQUIPO |
| [ADR-002: Next.js full-stack](ADR-002-nextjs-fullstack.md) | PROPUESTO - PENDIENTE DE VALIDACIÓN DEL EQUIPO |

No hay todavía validación grupal definitiva del stack. No interpretar la dirección inicial del monolito como aprobación de herramientas concretas.
