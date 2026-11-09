# Ventas: bitácora de avance

Change: [implement-sales](../../openspec/changes/implement-sales/proposal.md). Owner: Emi. Rama `ebenitez-ventas`, desde `origin/main` en `7f5eea8`. Fuentes: decisiones F1–F7 y B6 en [decisiones de producto](../DECISIONES_PRODUCTO_MVP.md), [reglas de dominio](../REGLAS_DOMINIO.md), [blueprint](../BLUEPRINT_IMPLEMENTACION_MVP.md) y ADR-003/005/006. RF-15..17 son referencia humana provisional; no se crean RF ni CU nuevos.

## 09/11/2026: change, schema de Ventas y origen VENTA de Inventario

### Qué se hizo

- Se creó el change `implement-sales` (propuesta, diseño, especificación `ventas` y 16 tareas, todas sin marcar). Ventas era una capacidad de Ronda 2 sin owner y la tomó Emi tras cerrar Auth.
- Se agregó el schema `lib/infraestructura/esquemas/venta.ts` con `venta` y `venta_linea`, y la migración `0004_ventas-base`.
- Se agregó el origen VENTA a Inventario, sobre el contrato de reversas que Claudio integró en `main`. Es un cambio compartido, ver la sección siguiente.
- Todavía **no existe** el servicio de Ventas, sus Actions ni la UI: `/admin/ventas` sigue siendo la pantalla de muestra.

### Historia: primera versión y rebase sobre el contrato de Claudio

El 02/11/2026 Claudio autorizó por mensaje meter una extensión de Inventario y documentarla. Se hizo una primera versión propia de las reversas (`revertirMovimientos`). Mientras tanto Claudio integró en `main` su propio contrato de reversas con otro diseño, así que se descartó la versión propia y se rehízo solo el origen VENTA sobre el contrato vigente. La primera versión queda como respaldo local en la rama `ebenitez-ventas-respaldo` (no está en el remoto).

### Cambio compartido en Inventario (módulo de Claudio)

**Por qué hacía falta.** `OrigenMovimiento` solo admitía el ajuste y `movimiento_stock` tenía una sola columna de origen. Sin un origen de venta, el descuento no puede identificar su línea ni la anulación hallar los movimientos a revertir.

**Qué cambió.**

| Archivo | Cambio |
| --- | --- |
| `lib/infraestructura/esquemas/inventario.ts` | Columna `venta_linea_id` (FK restrictiva a `venta_linea`), CHECK `movimiento_stock_origen_unico` ahora `num_nonnulls(ajuste_id, venta_linea_id) = 1` e índice único parcial `(venta_linea_id, tipo)`. |
| `lib/modulos/inventario/contrato.ts` | `OrigenMovimiento` pasa a ser `AJUSTE` o `{ tipo: "VENTA", ventaLineaId }`; helper `identificadorDeOrigen` para comparar orígenes sin conocer su tabla. |
| `lib/modulos/inventario/persistencia.ts` | Solo los puntos de extensión que dejó Claudio: `columnasDeOrigen`, `origenDeFila`, `mismoOrigen` y la lectura de `consultarMovimientosDeOrigen` (combina ambas columnas con `OR`). La lógica de locks, reversas y errores no se tocó. |
| `lib/modulos/inventario/inventario-en-memoria.ts` | El doble guarda el origen completo y reproduce el origen VENTA. |

**Cómo anula Ventas.** No hay una función nueva de reversas: la anulación (tarea 4.2) pide a Inventario los movimientos originales de las líneas con `consultarMovimientosDeOrigen(tx, origenes)` y aplica las variaciones opuestas con `reversaDe` en `aplicarMovimientos`, en la misma transacción. Cada movimiento se revierte una sola vez (`ErrorReversaInvalida`, motivo `YA_REVERTIDO`).

**Qué no cambió.** Saldos, ajustes, `crearSaldoCero`, `consultarDisponibilidad`, las migraciones `0000` a `0003`, las reglas de reversa de Claudio y Producto. No se tocó Auth ni la navegación.

**Migración `0004_ventas-base`.** Generada por drizzle-kit y revisada a mano: crea las dos tablas de Ventas con sus constraints, agrega la columna de origen y reescribe el CHECK incluyendo los orígenes existentes. Los movimientos ya guardados (todos de ajuste) cumplen el nuevo CHECK. A la fecha, `main` llega hasta `0003` y Compras no tiene migración propia. Cuando Compras necesite su `compra_linea_id`, la migración que se integre segunda debe volver a reescribir ese CHECK con todas las columnas de origen existentes y regenerarse con el número siguiente.

### Decisiones y pendientes

- El número `0004` lo toma Ventas por orden de llegada: **a confirmar con Claudio** si Compras sale antes.
- Sin definir y fuera de este cambio: precio editable por línea, motivo de anulación, medios de pago y límites. Están como preguntas abiertas en el diseño del change.
- Para Dashboard y Finanzas (Augusto) hace falta un contrato de lectura de Ventas: ventas vigentes por rango de fecha de operación con total y estado, y detalle con líneas. Se define con las tareas 4.x.

### Pruebas

Verificado sobre `7f5eea8` más este cambio:

- Unitarias: 490 (incluye 1 nueva del doble en memoria: origen VENTA, lectura de originales, reversa única y origen distinto).
- Integración: 240 contra PostgreSQL real, de las cuales son nuevas:
  - 10 de schema de Ventas (`lib/modulos/ventas/esquema.integracion.test.ts`): estados y anulación coherentes, comprador vacío, total, clave de solicitud única, cantidad, número de línea, nombre, subtotal exacto, número de línea único, precio histórico intacto ante cambio del producto y FKs restrictivas.
  - 9 del origen VENTA (`lib/modulos/ventas/inventario-venta.integracion.test.ts`): descuento con la línea como origen, CHECK de origen único e índice de original único, lectura de originales y marca de revertidos, anulación de varias líneas con reversas ligadas, segunda anulación rechazada, tres anulaciones simultáneas con una sola aplicada, origen distinto rechazado, stock insuficiente sin efectos parciales y rollback.
- Lint (sin advertencias), typecheck, `db:check` y `openspec validate --all --strict` en verde.

## 09/11/2026: Ventas completo (registro, consulta, anulación y pantalla)

### Qué se hizo

- **Reglas puras** (`reglas-venta.ts`, 1.3): valida fecha real, comprador opcional (vacío es Consumidor Final), líneas y cantidades; arma las líneas con nombre y precio del Producto y el total en centavos con la aritmética de `compras/dinero.ts` (reutilizada sin modificar). Las líneas repetidas del mismo producto no se fusionan.
- **Contrato** (`contrato.ts`, 1.2): tipos públicos y el puerto `LeerProductosVendibles`. Ventas depende de Inventario por `ContratoInventario` y de Producto por su lectura interna (`consultarProductosInternos`, ocultos incluidos).
- **Registro** (`registro.ts`, 3.1–3.3): en una sola transacción inserta cabecera y líneas y llama a `aplicarMovimientos` con cada línea como origen. Si falta stock se revierte todo y se informa el disponible (B6). La misma clave con el mismo contenido recupera lo ya confirmado, sin leer precios; con otro contenido es conflicto. La huella no incluye precios.
- **Anulación** (`anulacion.ts`, 4.2–4.3): bloquea la cabecera, pide a Inventario los originales de las líneas (`consultarMovimientosDeOrigen`) y aplica las variaciones opuestas con `reversaDe`; el estado pasa a ANULADA con fecha y actor. Una segunda anulación devuelve `ya_anulada` sin reintegrar.
- **Consulta** (`lectura.ts`, 4.1): listado por rango inclusivo de fecha de operación (nunca por fecha de carga) y estado, con límite y aviso de que hay más; detalle con líneas; y `resumirVentas`, que suma solo las vigentes y cuenta las anuladas aparte (insumo para Dashboard y Finanzas).
- **Administración con sesión** (`administracion.ts`, 5.1–5.2): cada comando exige la Administradora antes de cualquier efecto (`conAdministradora`); las lecturas lanzan `ErrorSesionRequerida`. Server Actions en `app/admin/(panel)/ventas/acciones.ts`, que refrescan stock, Home, catálogo y PDP solo después del commit y solo si la venta es nueva.
- **Pantalla** `/admin/ventas`: listado con filtros GET (sirven sin JavaScript), diálogo de registro multilínea con total estimado, diálogo de detalle con anulación en dos pasos y estados vacío, filtrado vacío y error. Se quitó el pie de prototipo de esa ruta (`estructura-admin.tsx`).

### Decisiones tomadas por defecto (a confirmar)

Las preguntas abiertas del diseño se resolvieron con el criterio mínimo, sin inventar requisitos:

- El precio de cada línea es el vigente del Producto y la interfaz no lo edita.
- La anulación no pide motivo.
- No se registran medios de pago.
- Sin límites de líneas, cantidades, importes ni fechas (futuras o antiguas): solo se exige una fecha real y cantidades enteras positivas. El listado sí tiene un límite técnico de 50 filas por defecto (máximo 200).
- Una venta en un formulario con error de stock conserva todo; si el servidor rechaza la venta sin guardarla, el siguiente envío usa una clave nueva; ante un fallo técnico se reintenta con la misma clave para no duplicar.

### Pruebas

Sobre `7f5eea8` más este cambio:

- Unitarias y de componentes: 536 (nuevas: 14 de reglas, 5 de presentación, 9 de Server Actions y 15 de la pantalla con RTL, que cubren conservación del formulario ante stock insuficiente, reintento con la misma clave, foco y `aria-describedby` en errores por línea y confirmación de anulación).
- Integración: 280 contra PostgreSQL real. Las de Ventas son 59: schema (10), origen VENTA en Inventario (9), registro (16, con tres envíos simultáneos de la misma solicitud, dos ventas de la última unidad y ventas cruzadas sin deadlock), anulación y consulta (14, con tres anulaciones simultáneas y anulación junto con una venta del mismo producto) y administración con sesión (10).
- E2E real con Auth y la base de pruebas (`e2e/ventas-real.spec.ts`), en escritorio y móvil: stock insuficiente conserva el formulario, venta de un producto oculto, descuento de stock, detalle, anulación con reintegro, filtro por estado, sin scroll horizontal y axe sin violaciones (listado y los dos diálogos).
- Lint (sin advertencias), typecheck, `db:check`, `openspec validate --all --strict` y `pnpm build` (lo hace Playwright al levantar el servidor) en verde.
- Cierres inesperados de procesos de Windows (`0xC0000409`) en integración: se reintentó y pasó completo.
- Fallos ajenos en la corrida E2E completa: `proveedores-real.spec.ts` (2) y `formularios-ux.spec.ts` (1) fallan por selectores que coinciden con dos elementos (`El nombre es obligatorio.` y `Categoría`) en pantallas de Proveedores y Productos. No se tocaron esos archivos y no se verificó si ya fallaban en `main`.

### Pendiente

- Revisión de Claudio: orden de migraciones frente a Compras (`0004`) y el uso de su contrato de reversas.
- Contrato de lectura para Dashboard y Finanzas: `resumirVentas` está implementado en el módulo, pero Resumen y Finanzas todavía no lo consumen (es trabajo de quien los integre).
- Integrar a `main` y avisar al equipo (6.3). Sin push hasta que Emi lo indique.
