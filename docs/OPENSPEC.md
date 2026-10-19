# OpenSpec con Codex

## Instalación y estado

Inicializado el **19/10/2026** en la raíz real de Angel Tears con **OpenSpec 1.14.3**, paquete oficial `@fission-ai/openspec`, Node 24.15.0. Instalación de herramienta global, no dependencia runtime/dev del proyecto: `package.json` y lock no cambian. Comando usado: `openspec init --tools codex --language Spanish --profile core --no-animation`, según help de la versión instalada; sin `--force` ni limpieza de archivos ajenos.

Integración generada: seis skills versionadas en `.agents/skills`: `openspec-propose`, `openspec-explore`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, `openspec-archive-change`. Codex usa skills, no se generaron comandos/prompts globales. AGENTS original fue preservado y extendido; la integración no sustituye sus reglas.

En Codex CLI/IDE se invoca por ejemplo `$openspec-explore` o `$openspec-propose`; en escritorio seleccionar la skill del proyecto. Si no aparece, volver a abrir el repositorio/reiniciar para detectar archivos. [Documentación oficial de skills](https://learn.chatgpt.com/docs/build-skills).

## Fuentes y flujo

Leer AGENTS, decisiones, ADR y blueprint antes del change. `openspec/config.yaml` aporta contexto breve/reglas por artefacto, con referencias en lugar de copiar el SRS. **OpenSpec gestiona cambios, no es SRS/RUP ni autoridad para ampliar alcance.**

1. Explorar y verificar alcance/contradicciones; nueva funcionalidad para Sofía/público se propone y analiza en fuentes.
2. Leer propuesta, diseño, specs/deltas y tareas del change asignado; confirmar autorización para implementarlo.
3. Implementar una parte verificable con tests/docs de esa parte y respetar ownership/contratos. Marcar tareas solo con evidencia real, no por escribir el plan.
4. Revisar/validar y seguir flujo Git normal. La excepción sin PR de esta preparación no se extiende a los slices.
5. Sincronizar/archivar únicamente tras implementación y aceptación. `openspec/specs` permanece sin specs principales en esta preparación; los deltas futuros están dentro de cada change activo.

## Ronda 1 activa

| Owner | Change |
| --- | --- |
| Emi | `implement-admin-auth-account` |
| Claudio | `implement-inventory-suppliers-purchases` |
| Augusto | `implement-products-public-seo` |

Son los únicos tres activos. Rondas 2/3 solo en [blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md) y [plan](PLAN_IMPLEMENTACION.md), sin changes ni responsables nuevos.

## Comandos verificados en 1.14.3

Desde la raíz del repositorio:

```sh
openspec --version
openspec context --json
openspec list --specs --json
openspec list --json
openspec status --change implement-admin-auth-account --json
openspec instructions proposal --change implement-admin-auth-account --json
openspec validate --all --strict --no-interactive --json
openspec doctor --json
```

`status` indica completitud de artefactos de planificación, **no implementación**; tasks sin marcar son el estado esperado actual. `doctor`/validación no sustituyen tests del proyecto ni trazabilidad académica. Consultar `--help` antes de usar comandos nuevos. No ejecutar apply, sync o archive durante esta preparación.

Para reproducir herramienta: `npm install -g @fission-ai/openspec@1.14.3`. Si ya existe, verificar versión y revisar antes de actualizar skills con `openspec update`; preservar AGENTS/config y revisar diff. No se fija configuración global personal ni se crean stores/worksets. Se puede desactivar telemetría por proceso con `OPENSPEC_TELEMETRY=0`, sin agregar variables de negocio.

Fuente de CLI: [OpenSpec oficial](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md), consultada el 19/10/2026; help local prevalece para sintaxis de esta instalación.
