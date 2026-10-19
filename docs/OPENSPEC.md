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
4. Seguir el [workflow Git vigente](GIT_WORKFLOW.md): rama propia desde main actualizado, sincronización/ownership, integrar main reciente y resolver conflictos entendidos antes de merge; tests aplicables, lint/typecheck/build, OpenSpec y diff. Luego merge, push y aviso al equipo. PR, aprobación de otro integrante y revisión cruzada no son gates; revisión humana adicional recomendable y responsabilidad técnica intacta.
5. Sincronizar/archivar únicamente tras implementación y aceptación técnica del responsable con evidencia, sin gate de revisión cruzada. `openspec/specs` permanece sin specs principales en esta preparación; los deltas futuros están dentro de cada change activo.

## Ronda 1 activa

| Owner | Change |
| --- | --- |
| Emi | `implement-admin-auth-account` |
| Claudio | `implement-inventory-suppliers-purchases` |
| Augusto | `implement-products-public-seo` |

Son los únicos tres activos. Rondas 2/3 solo en [blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md) y [plan](PLAN_IMPLEMENTACION.md), sin changes ni responsables nuevos.

### Referencia histórica de Auth discontinuada

La rama `docs/auth-stack-ebenitez`, commit `027e8a90ffe20ab89e74533ae09b58d510e00cf6`, se inspeccionó como referencia desde main; no se mergeó ni cherry-pickeó. Queda **discontinuada como candidata a integración**, conservada sin tocar. Emi partirá del main actualizado y usará exclusivamente `implement-admin-auth-account`, sin segunda especificación Auth.

De su `docs/features/AUTENTICACION.md`, ADR-004 histórico y ADR-006 se rescatan matriz de errores/datos seguros, contraseña nueva rechazada, reemisión pendiente, limitación de abuso sin bloqueo indefinido, setup seguro y prerrequisitos de tests. Se integran en el [diseño Auth](../openspec/changes/implement-admin-auth-account/design.md), ADR-004/006 vigentes y TESTING. ADR-003/005/006 históricos repiten herramientas ya decididas; no se copian ni duplican. Se descartan la segunda spec completa, nombres de ADR paralelos, Cuenta dentro de Configuración, ambigüedad de renovación y pendientes técnicos ya resueltos por main. Las decisiones finales de sesión/recovery y workflow prevalecen sobre esa referencia. No se ejecuta ninguna task por este rescate.

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
