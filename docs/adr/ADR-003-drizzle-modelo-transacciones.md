# ADR-003: Drizzle, modelo relacional y transacciones

**Estado: ACEPTADO — 19/10/2026.** Drizzle está aprobado expresamente por el responsable; las decisiones técnicas necesarias siguientes se adoptan bajo la autorización de la tarea de arquitectura. No hay instalación ni migraciones ejecutadas.

## Contexto y alternativas

PostgreSQL y el monolito ya están aceptados. Prisma/Kysely/SQL sin ORM no se reabren como selección: la tarea aprueba Drizzle. Para dinero se compararon `number` decimal (descartado por precisión), enteros SQL en centavos y `numeric` de escala fija. Para concurrencia: lectura previa sin bloqueo (incorrecta), aislamiento serializable con reintentos y bloqueos explícitos de filas.

## Decisión

- Drizzle ORM con `pg`/node-postgres en runtime Node, pool por proceso y conexión transaccional única; no HTTP driver sin transacciones interactivas. Drizzle Kit genera migraciones versionadas en una entrega futura, sin sincronización destructiva automática.
- Esquemas separados por capacidad, con ownership del [blueprint](../BLUEPRINT_IMPLEMENTACION_MVP.md). Producto es único; Inventario referencia su ID. No dos modelos Product ni un mega archivo de schema.
- Dinero PostgreSQL `numeric(18,2)`; Drizzle lo conserva como string. Entrada decimal se valida **antes** del cast SQL, que podría redondear. Aritmética en centavos `bigint` en servidor, conversión exacta desde/hacia string; nunca `parseFloat`/`Number` para cálculos. DTO usa strings decimales de dos posiciones y `moneda: ARS`, no bigint JSON. Precision/overflow se rechazan; aceptación comercial de cero/signos no definida sigue pendiente, no se deduce del tipo SQL.
- Cantidades `integer`, saldo/mínimo con CHECK no negativo, mínimo nullable. Cantidad de movimiento/línea positiva y signo del ajuste separado. Acumular demanda repetida por producto para validar stock; conservar líneas y sus precios/costos históricos, sin asumir que líneas con distinto costo se fusionan.
- Fechas comerciales `date` en ISO `YYYY-MM-DD`; timestamps `timestamptz` UTC. Períodos inclusivos por fecha comercial; mes actual según `America/Argentina/Cordoba`. No convertir fecha sin hora en medianoche UTC para filtrar.
- Categorías: lookup sembrado con código estable y etiqueta de las siete categorías aprobadas; FK restrictiva. Sin CRUD de categorías ni enum que obligue migración para corregir una etiqueta.
- Transacciones comerciales en READ COMMITTED con locks de cabecera y filas de Inventario, productos ordenados por ID, comprobación dentro del lock y CHECK de respaldo. Anulación cambia estado y aplica reversión en la misma transacción. Fallo en cualquier paso revierte todo.
- UUID de solicitud estable por intento lógico para confirmaciones/ajustes/egresos; unique + fingerprint canónico impide doble efecto. El mismo UUID con otro payload es conflicto. Cabecera/ajuste conserva clave y resultado; no tabla genérica de eventos ni bus. Anular se deduplica por estado bloqueado y unicidad de reversión.
- Migraciones globales y snapshots se generan **en serie** tras integrar el schema correspondiente; no mezclar journals concurrentes ni regenerar migraciones ya aplicadas. Emi coordina archivos compartidos, sin apropiarse del dominio comercial.

## Consecuencias

Conservar importes y nombres históricos por línea/cabecera; FKs comerciales RESTRICT y sin borrado físico normal. Finanzas lee fuentes vigentes; no tabla de resultado ni ledger financiero adicional. El historial de stock es necesario, no un nuevo módulo contable. Los fallos de red después de commit se resuelven consultando/reintentando la misma clave. Probar locks reales con PostgreSQL; SQLite no acredita estas garantías.

## Fuentes

[Drizzle: transacciones](https://orm.drizzle.team/docs/transactions), [tipos PostgreSQL](https://orm.drizzle.team/docs/column-types), [PostgreSQL: bloqueos explícitos](https://www.postgresql.org/docs/current/explicit-locking.html). Consultadas el 19/10/2026. Las reglas funcionales provienen de las decisiones del responsable, no de esas referencias.
