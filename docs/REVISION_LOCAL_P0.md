# Revisión local y preparación P0 de Productos

**20/10/2026.** Repositorio verificado mediante Git: `C:/Users/augus/OneDrive/Escritorio/angel_tears`, remoto `https://github.com/0Otsu/angel-tears.git`. Un worktree registrado, `.git` válido y working tree inicialmente limpio; no se encontraron modificaciones previas ajenas en esta copia. Esto identifica esta copia Git; no certifica que no existan otras carpetas del proyecto fuera de ella.

Main inicial `47d38cc8e558a03ea4f60a96f6bcbcba435622bc`; tras `git fetch origin`, estaba 0 ahead/6 behind, sin divergencia. Se actualizó únicamente por fast-forward a **`17dbb44f52dfdc7c1e0049ad168f75d57a4ae651`**, base de la rama local nueva `feature/productos-publico-seo`. No existía una rama local de ese nombre. La instrucción de esta entrega prevalece sobre el workflow general: **sin integrar esta rama a main, push, PR ni cambios de ramas remotas**.

## Estado real encontrado antes de P0

| Área / evidencia en la base | Implementado | Todavía falta |
| --- | --- | --- |
| Emi, `a44e7ee` integrado por `bffc5df` | Conexión lazy server-only Drizzle/pg, configuración Drizzle Kit, pool, ejemplo de entorno, guard y arnés PostgreSQL de pruebas; Vitest/RTL/jsdom/Playwright y scripts; contrato `exigirAdministradora` y consumidor de prueba | Schema Auth, migración Auth, instancia Better Auth/Handler, provisión, sesiones/login/logout/reset reales y protección efectiva de rutas |
| Auth actual | Contrato puro retorna identidad mínima o error; la instancia de aplicación rechaza todas las solicitudes, a propósito | Conectar sesiones reales. El shell admin y login siguen siendo UI mock, no quedan protegidos por la mera existencia del contrato |
| Claudio, `c16439f`, `bf076d6`, `3ed9976`, integrados por `17dbb44` | Contratos C0, reglas de stock/mínimo/ajustes, consolidación, clasificación/huella de solicitudes; doble de Inventario en memoria; aritmética exacta, líneas/total y plan de anulación de Compras; validación Zod de Proveedores | Schemas Inventario/Compras/Proveedores, migraciones, adaptadores SQL, locks/concurrencia/reversiones persistidas, casos de uso y conexión de UI |
| Augusto en la base | Público/admin y catálogo/PDP visuales con fixtures | Producto/Categoría reales, DTO interno, consulta persistente, alta coordinada con Inventario; posteriormente UI comercial/público/SEO/imagen |
| DB/schema/migrations | `lib/infraestructura/db.ts` y `drizzle.config.ts` existentes | No había archivos en `lib/infraestructura/esquemas` ni migraciones versionadas en `drizzle/`; configuración no equivale a tablas existentes |
| App | Home/catálogo/PDP con mocks; admin visual; sin Route Handlers de negocio/Auth | Persistencia y autorización conectadas; no cambiar estas pantallas en P0 |
| Testing | Base ejecutada: 13 archivos, 77 pruebas unitarias/componentes aprobadas | PostgreSQL local configurado y aceptación de reglas con BD real; E2E actual solo humo de login, no prueba Auth |
| OpenSpec | Tres changes activos, 0/20 tasks de Productos al iniciar | Las casillas de Emi/Claudio no reflejan por sí solas sus partes ya implementadas; no se modifican sus tareas ni se declara implementación nula por contar checkboxes |

Ramas disponibles tras fetch: `origin/ebenitez-auth-cuenta` en `a44e7ee` y `origin/feature/inventario-proveedores-compras` en `3ed9976`, ambas ya contenidas en la base main. La referencia histórica `origin/docs/auth-stack-ebenitez` sigue en `027e8a9`, discontinuada como candidata de integración. No se crearon ramas locales de otros owners ni se trajeron cambios suyos fuera de main. Las ramas documentales y `feature/ui-foundation` locales se conservaron.

Los párrafos históricos de ARQUITECTURA/TESTING/blueprint que todavía dicen «sin ORM», «sin tests» o «sin reglas de negocio» ya no describen este commit. Esta auditoría usa código, package/lock, tests y Git como evidencia del estado ejecutable, sin sustituir las fuentes de producto ni reescribir la planificación histórica.

## Dependencias y alcance autorizado

Se restauraron únicamente las versiones ya fijadas en main con `pnpm install --frozen-lockfile`: no se agregó una dependencia ni se modificaron package/lock/configs compartidos. En esta PC no había `.env.local`, `DATABASE_URL` ni `DATABASE_URL_TEST`; no se detectó PostgreSQL local disponible y Docker Desktop no tenía el engine accesible. No se crearon servicios, usuarios, bases o secretos.

Se puede avanzar en schema/contrato/reglas/consulta y preparación transaccional de Producto sin editar a Emi/Claudio. El **schema/migración Auth debe entrar primero** según el protocolo de DESARROLLO; la persistencia de Inventario sigue siendo de Claudio. Hasta entonces no generar la migración definitiva de Producto ni conectar el doble en memoria como Inventario productivo.

## Implementación local de P0

- `lib/infraestructura/esquemas/producto.ts`: único schema Producto/Categoría, UUID, slug único, FK restrictiva, precio exacto `numeric(18,2)`, opcionales, flags oculto/no destacado, versión y timestamps. Imagen principal embebida, toda ausente o completa; publicación requiere referencia. Sin saldo/mínimo, User, actor ficticio ni schemas de otros owners.
- `lib/modulos/productos/categorias.ts`: siete códigos estables con etiquetas aprobadas. `sembrarCategorias(tx)` prepara semilla explícita/idempotente; no se ejecutó ni se copió catálogo mock a BD.
- `contrato.ts` y consulta interna: `consultarProductosInternos(headers, ids)` devuelve IDs/nombre/slug/categoría/precio string/ARS/publicado/imagenValida; incluye ocultos, omite inexistentes, deduplica IDs y consulta en lote. Sin saldo ni costos/sesión. Auth antes de leer incluso con lista vacía; validación de IDs y allowlist de salida. La instancia real usa DB/guard existentes y falla cerrada mientras no haya sesiones.
- `validacion.ts`: requeridos/opcionales y precisión antes de SQL; no float ni redondeo. El normalizador representa también cero/signo a nivel **técnico**, sin decidir aceptación comercial: esa política sigue pendiente y debe resolverse antes de habilitar altas/ediciones de usuario. No hay endpoint/Action/UI para el alta preparada.
- `reglas-producto.ts`/persistencia: slug legible de alta y alternativa con UUID ante colisión, reservada por `ON CONFLICT` sin lectura previa; no modifica productos existentes ni recalcula slug al renombrar. La edición comercial todavía no se implementó.
- `insertarProductoOcultoConSaldo(tx, id, entrada, crearSaldoCero)`: adaptador interno preparado, recibe la tx del llamador y la pasa exactamente al contrato C0, sin abrir otra ni tragarse errores. Fuerza oculto/no destacado y no escribe saldo. Su futuro llamador debe autorizar, resolver política comercial, abrir una tx y propagar fallos. No se conectó a un flujo runtime ni se implementó Inventario SQL.
- Fixtures solo de pruebas y consumidores que usan el contrato Auth, el doble existente de Claudio y `calcularCompra`, sin segundo schema Producto. El costo de compra sigue siendo propio de la línea, no el precio actual de venta.

## Evidencia y límites de aceptación

Los tests de P0 cubren validación/decimales, slugs, permisos y errores, proyección segura y compatibilidad con consumidores; el doble de transporte pg comprueba SQL parametrizado, inserción oculta, colisiones, semilla repetible y que Drizzle solicita rollback al fallar C0. **No demuestra rollback, constraints, FK ni carreras reales en PostgreSQL.**

Se serializó el schema con la API de Drizzle Kit **solo en memoria**, revisando sus cuatro sentencias (dos tablas, una FK y un índice), sin escribir SQL, snapshots, journal ni migración definitiva y sin ejecutar sentencias contra una BD. No se usó `db:push`/`db:generate`/`db:migrate` ni `db:check` (este último crea un journal vacío antes de existir migraciones).

Referencias: [constraints Drizzle](https://orm.drizzle.team/docs/indexes-constraints), [transacciones](https://orm.drizzle.team/docs/transactions), [tipos PostgreSQL](https://orm.drizzle.team/docs/column-types); APIs contrastadas con la versión instalada 0.45.4/Kit 0.31.11, sin actualizar herramientas.

La task 1.3 de Productos puede cerrarse por el contrato/consulta publicados en esta rama y consumidores de prueba. 1.1 sigue pendiente de coordinación humana del DTO; 1.2 de migración/semilla/pruebas SQL en turno, y 1.4 de Inventario persistente y rollback conjunto real. No se marcan tareas por trabajo parcial ni se archiva/sincroniza el change. El detalle funcional sigue en [OpenSpec](../openspec/changes/implement-products-public-seo/design.md), sin segunda especificación de producto.

RF-04/05..07 son referencias humanas provisionales, con SRS/RUP canónicos y CU pendientes según [TRAZABILIDAD_MVP](TRAZABILIDAD_MVP.md). No se crean IDs ni se presenta aceptación académica. Tampoco se implementan UI CRUD, edición/precios históricos, upload Cloudinary, Home/catálogo/PDP persistidos, SEO, auth, inventario SQL ni migraciones.

## Validación local de esta entrega

| Comprobación | Resultado |
| --- | --- |
| Baseline anterior a P0, `pnpm test` | 13 archivos / 77 pruebas aprobadas |
| Pruebas nuevas de Productos | 3 archivos / 35 pruebas aprobadas |
| Suite completa, `pnpm test` | 16 archivos / 112 pruebas aprobadas |
| `pnpm test:integration` | Exit 1: falta `DATABASE_URL_TEST`; suite falla en setup, sus 4 casos quedan sin ejecutar. No cuenta como aprobación de PostgreSQL |
| `pnpm test:e2e` | No ejecutado: Chromium no está instalado y no se cambió UI. El humo de login existente no demostraría el dominio P0 ni Auth real |
| `pnpm lint` | Aprobado |
| `pnpm typecheck` | Aprobado |
| `pnpm build` | Aprobado; mismas rutas mock, sin requerir DB ni ejecutar semilla/alta |
| OpenSpec estricto / doctor | Tres changes válidos, doctor saludable; Productos 1/20 tareas completas, sin ejecutar tareas 2–5 ni archivar |
| Schema Drizzle Kit | Serialización técnica en memoria correcta; sin aplicación SQL ni archivos de migración |
| `git diff --check` | Aprobado |

Se mantiene el aviso preexistente de antigüedad de `baseline-browser-mapping`, sin actualizar dependencias para ocultarlo. La comprobación puntual del schema con Node produjo un aviso de detección ESM, sin cambiar `package.json` por ello. Ningún check anterior sustituye aceptación SQL integrada, coordinación humana o formalización SRS/RUP.
