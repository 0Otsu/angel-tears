# Producto 2.1: alta, consulta y edición administrativa

## RF relacionado

RF-04 Registrar producto, RF-05 Consultar productos y RF-06 Modificar producto de la [SRS vigente suministrada por el responsable](https://docs.google.com/document/d/1SugCvtS4De8LImkAEiis5pGWY8Eg99TgWIXzBWMS72w/edit). Este slice cubre datos de Producto; imagen, publicación, destacado y movimientos de stock tienen tareas propias. No afirma cobertura completa de esos RF.

## CU relacionado

Identificadores exactos de los CU pendientes de trazabilidad formal con RUP; no se asignan números nuevos. Ver [trazabilidad](../TRAZABILIDAD_MVP.md).

## Objetivo

Permitir a la Administradora registrar, consultar y editar productos persistidos desde `/admin/productos`, consumiendo Auth y C0 existentes.

## Contexto

Trabajo del 28/10/2026 en `feature/productos-2-1`, desde `main`/`origin/main` sincronizados en `d4524197645fbbcc68cf5c587022cbe4899c316c`, sin cambios locales previos. Se reutilizan schema Producto/Categoría, Zod de P0, reserva de slug, `insertarProductoOcultoConSaldo`, guard real y contrato persistente C0. No se alteran contratos compartidos, schema, migraciones, Auth ni Inventario.

## Reglas de negocio

- Nombre, precio y categoría obligatorios. Descripción, material, medida, color y cuidados opcionales; vacíos se almacenan como null.
- **Decisión humana expresa del 28/10/2026: solo precios mayores que cero.** Se aplica en la validación administrativa, manteniendo la representación técnica de P0.
- ARS como string decimal exacto compatible con `numeric(18,2)`, máximo dos decimales. No se convierte a `number`, no se redondea; se rechazan coma, notación científica, cero, negativos y desbordes.
- Categorías limitadas a las siete aprobadas y presentes en PostgreSQL; no se crea un CRUD de categorías.
- Alta oculta, no destacada, sin imagen; saldo cero y mínimo null mediante C0 en la misma transacción.
- Edición de los campos permitidos, con versión esperada; conserva slug, imagen, flags, fecha de creación y saldo. Nunca hay borrado físico.
- Fuentes: [decisiones A6/C1/C2/C3/C4](../DECISIONES_PRODUCTO_MVP.md), [reglas](../REGLAS_DOMINIO.md), blueprint y ADR-003/004/006 vigentes.

## Criterios de aceptación

- [x] Alta, consulta y edición exigen la sesión por el contrato real, también al invocar el caso de uso directamente.
- [x] Obligatorios, opcionales, categoría inexistente y dinero se validan en servidor.
- [x] Producto y saldo se crean juntos; un fallo de C0 posterior a insertar el saldo revierte ambas filas.
- [x] El listado proviene de PostgreSQL e incluye ocultos, sin fixtures ni stock duplicado en Producto.
- [x] Renombrar conserva el slug; editar precio no modifica flags, imagen ni Inventario.
- [x] Dos ediciones con la misma versión no se pisan: una confirma y la otra recibe conflicto.
- [x] La UI ofrece alta/edición y estados de carga, éxito, validación, sesión vencida, conflicto y error técnico; conserva entradas ante errores y enfoca el campo inválido.
- [x] Recorrido real en desktop, notebook y mobile; precio persistido y lectura tras recargar, sin desborde horizontal de página.
- [ ] Probar precios de operaciones históricas intactos al editar el actual: no existen aún operaciones persistidas de Compras/Ventas con importes históricos. Ver limitación abajo.

## Arquitectura y archivos

- `lib/modulos/productos/administracion.ts`: casos de uso protegidos, consulta administrativa, transacción de alta y actualización condicionada por id/versión.
- `administracion-aplicacion.ts`: composición con DB, `exigirAdministradora` y C0 reales, sin otra frontera de identidad.
- `administracion-contrato.ts`: proyección exclusiva del admin con opcionales/versión, sin alterar `ProductoInterno`. La consulta interna P0 sigue disponible a sus consumidores; el admin necesita campos adicionales y no cambia ese DTO.
- `validacion-administrativa.ts`: reutiliza Zod P0 y agrega la regla comercial positiva; la validación técnica compartida permanece intacta.
- `app/admin/(panel)/productos/acciones.ts`: Server Actions finas, allowlist de campos, encabezados reales y revalidación de `/admin/productos` solo tras confirmar.
- `app/admin/(panel)/productos/page.tsx`: guard de página existente y lectura RSC. Error de BD distinto de lista vacía; sesión vencida redirige al login.
- `components/admin/productos-admin.tsx`: formulario y listado. Versión del formulario fijada al abrirlo; refrescar el listado no actualiza silenciosamente una edición pendiente.
- `components/admin/estructura-admin.tsx`: únicamente textos condicionados a la ruta Productos para que ese flujo real deje de anunciar «sin persistencia»; conserva diseño y demás rutas.

La transacción la abre el caso de uso. `insertarProductoOcultoConSaldo` recibe esa tx y la pasa a C0 real; no se captura su error dentro de la tx. La edición solo actualiza Producto. No hay endpoints REST internos ni infraestructura adicional de historia.

## Fuera de alcance

Cloudinary, imagen/reemplazo, publicar/ocultar/destacar, catálogo/Home/PDP persistidos, SEO, stock editable, Compras/Ventas y rediseño general del admin. La UI mínima autorizada aquí no cierra la task 2.5 del flujo completo de imágenes/publicación. Las tareas 2.2–2.5 permanecen sin marcar.

## Casos de error

Sin sesión no se consultan ni modifican datos. Entrada inválida devuelve errores de campo sin persistir. Categoría aprobada ausente de BD rechaza el guardado. Versión atrasada devuelve conflicto; id inexistente devuelve no encontrado. Fallos técnicos devuelven mensaje neutro sin SQL/payload/stack; el log registra únicamente el tipo de error. Las entradas se conservan ante rechazos y fallos; una alta confirmada limpia el formulario.

## Tests y validaciones

- `administracion.test.ts`: guard antes de cualquier lectura, transacción o C0.
- `administracion.integracion.test.ts`: 18 casos sobre PostgreSQL real, incluida sesión Better Auth real, precisión monetaria exacta, creación/rollback conjunto, lectura de ocultos, edición y concurrencia.
- `acciones.test.ts`: allowlist, encabezados, referencia/versionado, revalidación tras éxito y errores sin filtraciones.
- `productos-admin.test.tsx`: ocho casos RTL sobre conservación/foco, carga, errores, sesión vencida, versión pendiente y categorías ausentes.
- `e2e/productos-2-1.spec.ts`: tres recorridos contra build/servidor Next real y BD de tests protegida: desktop 1440×1000, notebook 1280×800, mobile 390×844. Alta/consulta/edición, validación positiva, recarga, precio exacto, saldo cero y sesión vencida sin mutación. Capturas locales en `test-results/`, ignoradas por Git.

Evidencia ejecutada: `pnpm test` (237 pruebas), Producto + Inventario PostgreSQL (45), E2E del slice (3), lint, typecheck y build. `db:check` correcto; `db:generate`: **No schema changes, nothing to migrate**. OpenSpec strict: tres changes válidos; doctor saludable. `git diff --check` correcto. Permanece el aviso previo de antigüedad de `baseline-browser-mapping`; no se actualizan dependencias por ese aviso. Chromium se instaló como prerrequisito local de Playwright, sin cambiar package/lock.

## Dependencias, datos locales y pendientes

Producto 1.1 sigue abierto: Claudio confirmó el DTO; falta la confirmación humana de Emi. Esta entrega solo consume la frontera Auth vigente, autorizada por el responsable, y no cambia tareas de otros owners.

La historia de migraciones sigue siendo `0000_auth-base`, `0001_catalogo-proveedores-base`, `0002_inventario-base`. El schema actual tiene Producto, Categoría, Proveedor, Inventario/ajustes/movimientos y Auth; no tablas de compra/venta/líneas históricas. Se prueba que solo cambia el precio actual de Producto, pero **no se presenta esa prueba como evidencia de conservación de importes históricos inexistentes**. La regresión con operaciones previas queda pendiente al integrar esos módulos. No se inventa una tabla de precios, eventos ni referencias ficticias para aprobarla.

En desarrollo local había cero categorías/productos/saldos. Se ejecutó explícitamente la función P0 existente `sembrarCategorias` en una tx, contra `angel_tears_dev` local verificada: quedaron siete categorías aprobadas, cero productos y cero saldos. No se tocó la cuenta administrativa. No hay ejecución automática de esta preparación en arranque/build/producción ni productos ficticios sembrados. Las pruebas usan exclusivamente la BD de tests validada por el guard existente y limpian sus datos.

## Notas/decisiones y estado de entrega

La entrega inicial en `d5232f9` dejó 2.1 sin marcar y la rama sin merge/push para revisión. Posteriormente, el 28/10/2026, el responsable autorizó expresamente cerrar e integrar Producto 2.1 en main, manteniendo la limitación histórica documentada y sin avanzar imágenes. OpenSpec **2.1 queda marcada completa para el alcance implementado y aceptado**; la regresión de conservación de importes históricos sigue pendiente para cuando existan Compras/Ventas persistidas. No se declara probado lo que todavía no puede verificarse. 1.1 y 2.2–2.5 no cambian.

Revisión de cierre: working tree inicial limpio en `d5232f9`; `fetch` confirmó `origin/main` sin avances desde `d452419`, ancestro de la rama, sin divergencia ni conflictos que integrar. Diff completo limitado al CRUD protegido, UI mínima y tests/evidencia; no cambios de Auth/Inventario, DTO compartido, schema, migraciones, imágenes o publicación. Se repitieron 237 pruebas unitarias/componentes, las 45 PostgreSQL de Producto/Inventario, lint, typecheck y build. Se verifican además `db:check`, `db:generate` sin cambios, OpenSpec strict/doctor y diff antes de integrar. La integración autorizada conserva la rama y usa push sin force; el resultado final se comprueba en Git.
