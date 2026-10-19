# Flujo de Git y revisión

`main` representa código integrable/estable: contiene UI Foundation y planificación, sin negocio persistido. Decisión humana del **19/10/2026** para esta etapa: trabajar en ramas propias e integrar a main después de los checks. **No son obligatorios PR, aprobación de otro integrante ni revisión cruzada previa al merge.** La revisión humana adicional sigue siendo recomendable; el responsable debe entender y poder explicar su cambio.

## Ramas

- `feature/...`: funcionalidad, por ejemplo `feature/ventas` o `feature/productos`.
- `fix/...`: correcciones.
- `docs/...`: documentación, por ejemplo `docs/arquitectura`.
- `refactor/...`: reorganización sin cambiar comportamiento.

Mantener cada rama acotada a una tarea/change y su ownership. No modificar módulos ajenos sin necesidad; coordinar antes los archivos y contratos compartidos según el blueprint.

## Proceso

1. Verificar estado local y actualizar main de forma segura, sin sobrescribir trabajo ajeno.
2. Crear rama propia desde main actualizado.
3. Trabajar solo dentro del change/ownership asignado, conservando trazabilidad y control de alcance.
4. Mantener la rama sincronizada con main; coordinar contratos, archivos compartidos y migraciones.
5. Antes del merge, integrar main reciente de forma segura y resolver solo conflictos entendidos. Ejecutar tests aplicables, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `openspec validate --all --strict --no-interactive` y `git diff --check`; revisar el diff completo y los archivos preparados. Si falta un script de test, informarlo, sin inventar un PASS. Repetir checks afectados si la integración cambia el resultado validado.
6. Con controles correctos y [Definition of Done](DEFINICION_TERMINADO.md) técnica satisfecha, mergear la rama a main actualizado.
7. Hacer push de main. Si avanzó remotamente, integrar con seguridad y repetir los controles afectados; no forzar ni sobrescribir historia.
8. Avisar al equipo qué se integró, resultados de validación y pendientes.

La tarea utiliza su [change OpenSpec](OPENSPEC.md) y cubre [el formato de feature](features/TEMPLATE.md) cuando corresponda, sin duplicar especificaciones. El responsable revisa el diff y la evidencia y puede explicar lo implementado. Se recomienda pedir otra revisión cuando ayude; no se exige PR ni aprobación cruzada como gate. Esto no elimina checks, ownership, coordinación ni resolución humana de decisiones de producto/arquitectura.

## Commits

Usar mensajes claros. Se sugiere Conventional Commits:

- `feat:` nueva funcionalidad.
- `fix:` corrección.
- `docs:` documentación.
- `test:` pruebas.
- `refactor:` reorganización.
- `chore:` mantenimiento.

El commit inicial `docs: establish project engineering baseline` es antecedente histórico. Las contribuciones actuales siguen el flujo de ramas, checks, merge y push descrito arriba; un PR es opcional.

## Repositorio y controles

Usar un único repositorio privado `angel-tears`. No sobrescribir un repositorio existente. Revisar el diff y los archivos preparados antes de confirmar; excluir secretos y archivos locales.

Las plantillas de GitHub apoyan el proceso, pero no aplican por sí mismas protección de ramas. La configuración de protecciones, estrategia de merge y CI definitivo queda pendiente del equipo. No configurar automatizaciones complejas en esta etapa.
