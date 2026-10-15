# Flujo de Git y revisión

`main` representa código integrable/estable. En la etapa actual contiene la base documental revisable. Evitar pushes directos a `main` en el trabajo cotidiano.

## Ramas

- `feature/...`: funcionalidad, por ejemplo `feature/ventas` o `feature/productos`.
- `fix/...`: correcciones.
- `docs/...`: documentación, por ejemplo `docs/arquitectura`.
- `refactor/...`: reorganización sin cambiar comportamiento.

Mantener cada rama y PR acotados a una tarea. No modificar módulos ajenos sin necesidad.

## Proceso

Issue/tarea → branch → implementación asistida por IA → revisión del responsable → tests → Pull Request → revisión por otro integrante → merge.

La tarea utiliza [el formato de feature](features/TEMPLATE.md) cuando corresponda. El responsable verifica que entiende el cambio y puede explicarlo. La revisión de otro integrante aplica [la definición de terminado](DEFINICION_TERMINADO.md). Resolver observaciones antes del merge.

## Commits

Usar mensajes claros. Se sugiere Conventional Commits:

- `feat:` nueva funcionalidad.
- `fix:` corrección.
- `docs:` documentación.
- `test:` pruebas.
- `refactor:` reorganización.
- `chore:` mantenimiento.

La preparación inicial solicitada se registra en `main` con `docs: establish project engineering baseline`; las siguientes contribuciones siguen el flujo de ramas y PR.

## Repositorio y controles

Usar un único repositorio privado `angel-tears`. No sobrescribir un repositorio existente. Revisar el diff y los archivos preparados antes de confirmar; excluir secretos y archivos locales.

Las plantillas de GitHub apoyan el proceso, pero no aplican por sí mismas protección de ramas. La configuración de protecciones, estrategia de merge y CI definitivo queda pendiente del equipo. No configurar automatizaciones complejas en esta etapa.
