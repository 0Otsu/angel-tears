# Existencias integradas en Productos

## Alcance autorizado

Solicitud de Augusto tras la revisión de Sofía, 11/11/2026. RF-04/05/06/08 y
CU-01/02/03 contrastados con SRS y RUP canónicos (consulta de Google Docs, sin
edición). CU-03 ya contempla el ajuste con cantidad, motivo e historial; CU-01
mantiene alta con saldo cero y ajuste inicial identificado, sin compra ficticia.

Se integra la presentación de existencias en listado y edición de Producto. No
se traslada su persistencia a Producto ni se modifica el contrato de Inventario.
Se reutilizan consultarDisponibilidad, DialogoAjusteStock, DialogoHistorialStock y
sus Server Actions autorizadas. Datos comerciales y ajustes continúan separados.
Sin cambios en Compras, Ventas, Auth, tablas, migraciones, precios o saldos reales.

## Diseño previsto

- Listado: existencias, estado centralizado 0 / 1–3 / 4+, filtro de stock separado
  del filtro publicado/oculto. Un fallo de lectura no se representa como cero.
- Edición: sección Existencias en Datos, independiente del formulario comercial,
  con ajuste e historial reutilizados. Confirmación con saldo devuelto por backend.
- Navegación: Productos como entrada; alertas dirigen al filtro o producto;
  /admin/stock redirige tras autorización y conserva los filtros compatibles.
- La UI de historial existente consulta ajustes manuales; los movimientos de
  compra/venta se mantienen en sus respectivos módulos y en el ledger interno.
  No se amplía silenciosamente ese contrato ni se presenta como historial completo.
- Verificaciones de mutación exclusivamente en angel_tears_preview_20261111;
  la base demo de Sofía y angel_tears_dev permanecen sin modificaciones.

## Resultado implementado

En Productos se conserva nombre/categoría/precio/publicación/acciones y se agrega
la cantidad exacta con badge y filtro independiente `stock=sin_stock|pocas|disponible`.
La lectura agrupada ya existente entrega saldo y disponibilidad; no hay SQL nuevo
ni otra consulta por fila. En edición se consulta el mismo contrato para ese ID,
después de la guardia. No cambia el DTO comercial ni se añade un saldo persistido.

Datos mantiene su formulario y agrega una tarjeta Existencias independiente.
Se reutilizan los dos diálogos y la Action de Inventario. El callback del ajuste
entrega también saldoResultante confirmado; una lectura RSC nueva prevalece sobre
esa confirmación local. La Action invalida Productos, edición y Resumen además de
las superficies públicas anteriores. No envía stock dentro del FormData comercial.
Datos/Imágenes/Vista previa y alta con C0 permanecen. El tipo INICIAL sigue en el
servicio existente, comprobado en PostgreSQL; no se inventa otra carga inicial.

Se retira Inventario del menú principal. `/admin/stock?estado=pocas` redirige, tras
exigir sesión, a `/admin/productos?stock=pocas`; los otros filtros válidos se
preservan y los desconocidos vuelven a Todos. Sus Actions y lógica interna siguen
disponibles. Las tarjetas del Dashboard enlazan a Productos filtrado; reposición
enlaza al editor correspondiente con `#existencias`. La confirmación de publicación
sin stock ofrece ese mismo acceso. No se modificaron el diseño ni las cifras de
Finanzas/Dashboard fuera de esos enlaces.

Archivos: páginas Productos/listado/edición y redirección stock; componentes
productos-admin, editor-producto, existencias-producto (nuevo), acciones-producto,
dialogo-ajuste-stock, dialogo-historial-stock, estructura-admin y resumen-admin;
presentación inventario y límite Next stock/acciones. Pruebas de esos componentes,
páginas y Actions, más guiones E2E Stock/Finanzas adaptados a sus nuevos destinos.
Se preserva el resto del diff local anterior de Finanzas y cargas administrativas.

## Verificación ejecutada

- 164 pruebas focalizadas en 12 archivos: componentes, páginas, guardias,
  presentación e invalidación tras ajustar. Incluye 0/1/2/3/4/20, filtro combinado
  con publicación, stock desconocido, historial, rechazo, retry con la misma clave,
  envío único y saldo confirmado distinto de la estimación.
- PostgreSQL real exclusivamente en `angel_tears_preview_20261111`: alta real C0,
  saldo INICIAL, reintento sin doble efecto, rechazo de retiro mayor al saldo,
  transiciones 0/4/3/1/0, compra 4→7, venta 7→5, anulación 5→7 y compra 7→4;
  repetición de anulaciones sin efecto y reversas/historial comprobados. Comandos
  e historial sin sesión rechazados. Toda esta prueba terminó en ROLLBACK y se
  verificó que el producto temporal no quedó persistido.
- Chromium con login normal en preview: ruta antigua/filtros, menú sin Inventario,
  consulta y ajuste desde editor 0→1→3→4, rechazo visual de saldo negativo,
  historial y Dashboard→Productos. Operación concurrente controlada: estimación
  4+2=6, retiro real de otra operación a 3 y confirmación visible de 5. Un precio
  local sin guardar permaneció sin guardar durante el ajuste. Sin pageerrors.
- Revisión 320/390/768/1440 px sin overflow; teclado, Escape y retorno de foco.
  Capturas locales revisadas: `work/existencias-{listado,editor}-{320,390,768,1440}.png`.
  El fixture UI se creó mediante Producto+C0 y se retiraron solo sus filas
  dependientes controladas al finalizar. Huella de los demás productos/saldos
  de preview idéntica antes/después, en `work/existencias-ui-limpieza.json`.
- Lint, TypeScript y build de producción correctos. No se ejecutó el arnés E2E
  contra `_test` ni suites completas. Los guiones versionados quedaron adaptados;
  el recorrido ejecutado fue el focalizado de preview descrito arriba.

No se modificaron desarrollo, demo_sofi, Cloudinary, esquemas, migraciones,
contratos ni servicios de Inventario/Compras/Ventas/Auth. Main remoto consultado
sin cambiar referencias locales: `4545c07`, igual a la base. La punta conocida de
`feature/inventario-reversas` (`a07f011`, Claudio) ya es ancestro de esta base;
no se duplica ni reimplementa ese trabajo. No implica aceptación humana ni
integración Git. Permanece la rama feature/finanzas-dashboard sin commits nuevos.

## Propuesta documental puntual para revisar con el equipo

Fuentes leídas, no editadas: [SRS](https://docs.google.com/document/d/1SugCvtS4De8LImkAEiis5pGWY8Eg99TgWIXzBWMS72w/edit)
y [RUP](https://docs.google.com/document/d/1IrhOgqJVge5cLLQkOo09Rq-L1NjrH7yjcF2UP18UvCQ/edit).

1. **Clases:** representar en Producto `/stockActual: Entero {derivado, solo lectura}`,
   obtenido del saldo único de Inventario. Mantener su asociación técnica 1:1;
   aclarar que no son dos atributos persistidos independientes. Cambiar la entrada
   de menú no elimina la responsabilidad ni la clase interna Inventario.
2. **CRC Producto:** sumar consulta/presentación de existencias y solicitud de
   ajuste como colaboración con Inventario. Conservar identidad, precio, imágenes,
   publicación y referencias históricas. No proponer `setStock` ni actualización
   directa del saldo al modificar los datos comerciales.
3. **CRC Inventario:** conservar consultarDisponibilidad, crearSaldoCero,
   registrarAjuste/aplicarMovimientos, validación no negativa, historia, clasificación
   general y reversas únicas. Las operaciones de Compra/Venta colaboran con ese
   mismo servicio, aunque no exista una pantalla principal Inventario.
4. **CU-01:** ya exige C0 y ajuste inicial identificado; solo aclarar que el acceso
   posterior está en Editar producto → Datos → Existencias. **CU-02:** explicitar
   cantidades/badges/filtro general, incluidos ocultos. **CU-03:** ya incluye ajuste
   con motivo e historial; aclarar guardado separado, estimación y confirmación del
   saldo vigente bajo lock, sin pérdida de datos comerciales no guardados.
5. **Métodos/observaciones de Sofía:** vincular cada responsabilidad anterior con
   las operaciones reales citadas, separar UI, modelo conceptual y tablas físicas;
   no añadir stock duplicado ni métodos CRUD de movimientos append-only.
6. **Riesgos:** queda identificada para la próxima corrección documental la
   clasificación Alto/Medio/Bajo. No se modifica ahora ni se inventan riesgos
   o aprobaciones de la responsable.

Estas son propuestas para clases/CRC y aclaraciones de CU, no cambios aplicados a
Google Docs/diagramas originales. El historial UI heredado continúa limitado a
ajustes manuales; ampliar su consulta unificada con Compras/Ventas requiere una
tarea coordinada con Claudio y Emi, sin alterar las operaciones ya existentes.

## Reanudación y disponibilidad local

Se conserva la implementación y la evidencia de 164 pruebas/build/lint/TypeScript/
OpenSpec anteriores; no se repiten esas suites. El único pendiente operativo se
completa dejando localhost:3000 con el build local validado y la conexión temporal
del proceso a `angel_tears_preview_20261111`. No se cambia `.env.local`. Esa preview
tiene tres productos DEMO; los siete productos de desarrollo y su copia separada
de demostración permanecen sin modificaciones y no son la conexión activa.

Verificación adicional ejecutada sin guardar ajustes: login normal, listado,
edición con saldo real 3, apertura del ajuste y estimación 5 al ingresar 2, historial,
ausencia de Inventario en navegación, redirección antigua con filtro y acceso desde
Dashboard, a 1440/390 px con teclado/Escape y sin errores JavaScript. El acceso
anónimo continúa bloqueado. Capturas actuales:
`work/cierre-existencias-editor-{1440,390}.png`.

Se mantiene pendiente la revisión visual humana e integración autorizada. Rama
`feature/finanzas-dashboard`, HEAD `4545c07`, sin commits nuevos ni push/merge.
El manifiesto de los 26 archivos de esta contribución se conserva para revisión
en `work/archivos-productos-existencias.txt`; el diff acumulado de la rama incluye
además el trabajo anterior de Finanzas y estados de carga, que se preserva.
