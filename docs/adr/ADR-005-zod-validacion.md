# ADR-005: Zod en los límites de entrada

**Estado: ACEPTADO — 19/10/2026**, por elección explícita del responsable. No instalado como dependencia funcional.

## Contexto y alternativas

TypeScript no valida datos en runtime; HTML y validación cliente no protegen servidor. Se descartan validadores manuales duplicados y usar validación de formulario como única autoridad. Zod es la herramienta aprobada, no se reabre su elección.

## Decisión

Zod valida FormData, searchParams, JSON y metadatos de uploads en Actions/Handlers. Schemas de entrada por módulo; reutilización cliente solo si no importa servidor/secretos. La aplicación recibe valores parseados; las reglas de negocio se aplican sobre el estado vigente dentro de la operación, no dentro de refinements con efectos de BD.

Separar formato (cantidad entera positiva, fecha ISO válida, decimal de hasta dos posiciones) de dominio (stock suficiente, compra anulable, publicación con imagen válida). Conservar el texto monetario hasta convertirlo exactamente; no coerción a float ni redondeo por `numeric`. Los límites comerciales no aprobados se registran como pendientes, sin extraerlos del mock.

Errores esperados mediante resultado discriminado con errores por campo y código seguro; excepciones de infraestructura registradas con correlación. El formulario conserva entradas no sensibles; nunca contraseña/token en logs o persistencia cliente. No fijar nombres de tablas a partir de DTO.

## Consecuencias

Se comparten validaciones de formato donde aporte valor, pero las invariantes siguen perteneciendo al dominio. Pruebas de frontera y errores por campo; no tests que solo repitan la declaración del schema.

Fuente: [Zod](https://zod.dev/), consultada el 19/10/2026.
