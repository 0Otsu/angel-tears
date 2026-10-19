# Definición de terminado

Aplicar a cada entrega de implementación futura y explicar los puntos que no correspondan. El hecho de que un agente afirme que terminó una tarea **no significa que esté terminada**.

- [ ] Requisito identificado y trazado a las fuentes RF/CU correspondientes.
- [ ] Reglas de dominio cumplidas.
- [ ] Validaciones en servidor implementadas cuando correspondan.
- [ ] Errores tratados.
- [ ] Tests correspondientes ejecutados y resultados revisados.
- [ ] Tests existentes funcionando.
- [ ] Responsive verificado cuando aplique.
- [ ] Accesibilidad básica revisada.
- [ ] Diff y evidencia revisados por el responsable; main reciente integrado de forma segura, conflictos entendidos y checks técnicos aplicables correctos según el [flujo Git](GIT_WORKFLOW.md).
- [ ] El responsable puede explicar lo implementado.
- [ ] Documentación actualizada, incluidas decisiones y pendientes pertinentes.

La revisión debe evaluar criterios de aceptación y evidencia. Por decisión humana del 19/10/2026, revisión adicional recomendable, PR y aprobación cruzada **no son gates obligatorios** en esta etapa; sí lo son los controles técnicos aplicables y que el responsable pueda explicar el cambio. Antes de merge: tests aplicables, lint/typecheck/build, validación OpenSpec y `git diff --check`, conservando ownership, coordinación y trazabilidad. Un punto no aplicable se justifica; un punto pendiente no se marca como cumplido.

En UI foundation corresponden lint/typecheck/build, revisión responsive y de navegación mock, integridad documental y ausencia de secretos. Validación de servidor, persistencia y pruebas de dominio no aplican a aquella entrega porque no implementó operaciones de negocio. El responsable aprobó la revisión de UI y autorizó su cierre condicional el 16/10/2026; no hay aprobación de otro integrante registrada en GitHub ni se inventa. La trazabilidad a SRS/RUP sigue pendiente. Ver [migración y cierre](MIGRACION_UI.md).
