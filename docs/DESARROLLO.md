# Desarrollo y colaboración

## Estado y preparación

Existe una UI foundation ejecutable en App Router con público y administración visual. Los mocks no guardan información. El acceso administrativo solo navega; no autentica.

El bootstrap del 16/10/2026 y la arquitectura/OpenSpec del 19/10/2026 están autorizados. Stack complementario aceptado en ADR-003..008, sin integración funcional. Fuentes académicas canónicas/trazabilidad y pendientes de producto/operación siguen abiertos.

## Trabajo de humanos y agentes

1. Definir tarea mediante [OpenSpec](OPENSPEC.md), cubriendo las secciones de [la plantilla de feature](features/TEMPLATE.md) sin duplicarlas. Referenciar fuentes RF/CU reales; si faltan, marcar pendiente, no inventar ni declarar aceptación formal.
2. Leer las fuentes y documentos obligatorios de [AGENTS.md](../AGENTS.md).
3. Identificar reglas aplicables, criterios de aceptación, supuestos y decisiones necesarias. Resolver cambios de alcance, reglas o arquitectura mediante revisión humana y las fuentes de mayor prioridad.
4. Crear una rama acotada y trabajar según [GIT_WORKFLOW.md](GIT_WORKFLOW.md).
5. El responsable revisa lo asistido por IA y debe poder explicarlo; ejecutar los tests correspondientes.
6. Antes del merge, integrar main reciente de forma segura, resolver conflictos entendidos y comprobar [la definición de terminado](DEFINICION_TERMINADO.md): tests aplicables, lint/typecheck/build, OpenSpec y diff. Con checks correctos, mergear a main, push y avisar al equipo.

La IA no sustituye las fuentes ni responsabilidad humana. R1: Emi Auth/Cuenta; Claudio Inventario/Proveedores/Compras; Augusto Productos/Público/SEO. [Blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md) fija modelo/contratos/archivos y coordinación de dependencias/migraciones. R2/R3 sin owners. El workflow vigente de esta etapa no exige PR, aprobación de otro integrante ni revisión cruzada; otra revisión es recomendable, no un gate. Se mantienen ramas individuales, sincronización, coordinación, checks, trazabilidad y alcance.

## Idioma y nomenclatura

Documentación interna en español. Mantener `README.md`, `AGENTS.md` y `CLAUDE.md` como nombres estándar reconocidos por herramientas. Conservar nombres obligatorios de frameworks y librerías.

Para dominio y código futuro, usar español sin tildes ni ñ en identificadores:

- Módulos: `productos`, `inventario`, `proveedores`, `compras`, `ventas`, `egresos`, `reportes`, `autenticacion`.
- Funciones: `registrarVenta`, `anularCompra`, `consultarStockBajo`.
- Archivos: `registrar-venta.ts`, `reglas-stock.ts`.

Son ejemplos de nomenclatura; no son archivos o funciones a crear ahora. `.editorconfig` fija UTF-8, fin de línea LF e indentación de dos espacios como base editorial.

## Dependencias y decisiones

Justificar necesidad/impacto de dependencias en el slice. Drizzle/pg, Better Auth/Resend, Zod, Vitest/RTL/Playwright y Cloudinary ya tienen decisión en ADR; no se instalan como efecto del blueprint. Hosting/DB administrada/observabilidad/analytics/CI avanzado siguen pendientes. Tailwind/Boty son referencia visual, no fuente de requisitos. Cambios funcionales nuevos se proponen antes de ejecutar.

## Ejecución local

Node 24.15.0 y pnpm 11.25.0. `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm start`. El script dev usa webpack; build usa Next con validación de tipos activa. ESLint flat config hereda Next core-web-vitals y TypeScript, sin desactivar reglas. No hay suite de testing todavía.

Los scripts nativos permitidos de pnpm están limitados a sharp y unrs-resolver. Ver historia en [MIGRACION_UI.md](MIGRACION_UI.md). `work/` contiene evidencia local no versionada. No se necesitan secretos para esta base. OpenSpec global 1.14.3 y seis skills de Codex se documentan en OPENSPEC; su instalación no modifica package/lock. Solo tres changes activos; no ejecutar apply/archivar automáticamente.
