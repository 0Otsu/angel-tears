# Calidad

## Objetivos

- Simplicidad y mantenibilidad: cambios acotados, nombres comprensibles y responsabilidades claras.
- Integridad: stock nunca negativo, operaciones críticas completas o sin efecto, importes históricos y anulaciones aplicadas una sola vez.
- Seguridad: validación y autorización en servidor y secretos fuera del repositorio.
- Usabilidad: uso desde celular y computadora y accesibilidad básica.
- SEO/indexabilidad del sitio público.
- Evolución: módulos separados sin infraestructura o abstracciones innecesarias.
- Trazabilidad: vincular tareas a RF/CU de fuentes validadas cuando estén disponibles.

## Revisión

La calidad se comprueba mediante criterios de aceptación, pruebas relevantes y revisión humana. No se exige cobertura del 100%. El responsable debe entender y explicar el resultado, incluso si recibió asistencia de IA.

No hay todavía métricas cuantitativas de rendimiento, disponibilidad, volumen o accesibilidad formal. No inventar compromisos ni valores objetivo. Acordarlos cuando se validen requisitos no funcionales.

Aplicar [TESTING.md](TESTING.md), [SEGURIDAD.md](SEGURIDAD.md) y [DEFINICION_TERMINADO.md](DEFINICION_TERMINADO.md). La afirmación de un agente no constituye evidencia suficiente de cumplimiento.
