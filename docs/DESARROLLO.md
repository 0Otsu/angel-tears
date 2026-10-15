# Desarrollo y colaboración

## Estado y preparación

La implementación no comenzó. No hay aplicación, `src/`, manifiestos de paquetes ni dependencias. No ejecutar generadores o instalaciones como continuación automática de esta base.

Antes del bootstrap, el equipo debe incorporar la SRS validada y los artefactos RUP corregidos, resolver contradicciones y validar las decisiones técnicas necesarias. El stack Next.js/TypeScript/PostgreSQL sigue propuesto.

## Trabajo de humanos y agentes

1. Definir issue/tarea con [la plantilla de feature](features/TEMPLATE.md), enlazando RF/CU validados. Si no están disponibles, marcarlo como pendiente y resolverlo antes de dar por validada la tarea.
2. Leer las fuentes y documentos obligatorios de [AGENTS.md](../AGENTS.md).
3. Identificar reglas aplicables, criterios de aceptación, supuestos y decisiones necesarias. Resolver cambios de alcance, reglas o arquitectura mediante revisión humana y las fuentes de mayor prioridad.
4. Crear una rama acotada y trabajar según [GIT_WORKFLOW.md](GIT_WORKFLOW.md).
5. El responsable revisa lo asistido por IA y debe poder explicarlo; ejecutar los tests correspondientes.
6. Abrir PR, obtener revisión de otro integrante y comprobar [la definición de terminado](DEFINICION_TERMINADO.md) antes del merge.

La IA no sustituye las fuentes del proyecto ni la responsabilidad humana. No asignar integrantes en esta planificación.

## Idioma y nomenclatura

Documentación interna en español. Mantener `README.md`, `AGENTS.md` y `CLAUDE.md` como nombres estándar reconocidos por herramientas. Conservar nombres obligatorios de frameworks y librerías.

Para dominio y código futuro, usar español sin tildes ni ñ en identificadores:

- Módulos: `productos`, `inventario`, `proveedores`, `compras`, `ventas`, `egresos`, `reportes`, `autenticacion`.
- Funciones: `registrarVenta`, `anularCompra`, `consultarStockBajo`.
- Archivos: `registrar-venta.ts`, `reglas-stock.ts`.

Son ejemplos de nomenclatura; no son archivos o funciones a crear ahora. `.editorconfig` fija UTF-8, fin de línea LF e indentación de dos espacios como base editorial.

## Dependencias y decisiones

Justificar necesidad, alternativas e impacto antes de agregar dependencias; validar la decisión con el equipo y registrar ADR cuando corresponda. No elegir por cuenta propia ORM, autenticación, validación, CSS/UI, imágenes, hosting, seguimiento o CI definitivo.

Los comandos de instalación, desarrollo, pruebas y compilación se incorporarán después del bootstrap aprobado. No se documentan comandos ficticios.
