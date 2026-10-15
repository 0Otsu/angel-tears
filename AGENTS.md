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

El repositorio está en planificación/arquitectura. No crear `src/`, código de producción, bootstrap de Next.js ni instalar paquetes como continuación automática de esta preparación. La implementación requiere una tarea posterior y las decisiones previas que correspondan.

## Reglas de trabajo

- No inventar funcionalidades ni ampliar alcance.
- No cambiar arquitectura silenciosamente.
- No agregar dependencias sin justificar necesidad, alternativas e impacto y obtener la validación humana de la decisión correspondiente.
- No duplicar lógica de negocio ni modificar módulos ajenos sin necesidad de la tarea.
- Minimizar el alcance de cada cambio.
- No desactivar tests, omitir validaciones ni debilitar criterios para hacer pasar una tarea.
- Indicar supuestos y vacíos; no convertirlos en requisitos.
- Mantener documentación interna en español. Usar español sin tildes ni ñ en identificadores futuros; respetar nombres obligatorios de herramientas y frameworks.
- Proteger secretos y cumplir el flujo de revisión humana de Git.
- Basar cada tarea de implementación en `docs/features/TEMPLATE.md`, con requisitos y criterios verificables.

## Informe de entrega

Indicar qué cambió y por qué, supuestos, archivos modificados, tests ejecutados y resultados, checks no ejecutados con motivo y pendientes. La afirmación de un agente no reemplaza la definición de terminado ni la revisión humana. El responsable debe poder explicar lo implementado.
