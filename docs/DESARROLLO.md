# Desarrollo y colaboración

## Estado y preparación

Existe una UI foundation ejecutable en App Router con público y administración visual. Los mocks no guardan información. El acceso administrativo solo navega; no autentica.

El bootstrap fue autorizado por la tarea humana del 16/10/2026 y ADR-002 está aceptado: Next.js full-stack, TypeScript y PostgreSQL futuro. Siguen pendientes SRS/RUP validados, trazabilidad y herramientas para las siguientes etapas.

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

Justificar necesidad, alternativas e impacto antes de agregar dependencias; validar la decisión con el equipo y registrar ADR cuando corresponda. Tailwind y la UI Boty adaptada son la base aprobada. No elegir por cuenta propia ORM, autenticación, validación, testing framework, imágenes, hosting, seguimiento o CI definitivo.

## Ejecución local

Node 24.15.0 y pnpm 11.25.0. `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm start`. El script dev usa webpack; build usa Next con validación de tipos activa. ESLint flat config hereda Next core-web-vitals y TypeScript, sin desactivar reglas. No hay suite de testing todavía.

Los scripts nativos permitidos de pnpm están limitados a sharp y unrs-resolver. Ver la auditoría y versiones en [MIGRACION_UI.md](MIGRACION_UI.md). `work/` contiene evidencia local y no se versiona. No se necesitan secretos para la UI foundation.
