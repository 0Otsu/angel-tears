# Estados de carga del administrador

## Alcance y reutilización

Pasada de presentación autorizada dentro de feature/finanzas-dashboard. Sin
modificar servicios, validaciones, transacciones, idempotencia, permisos,
contratos, migraciones ni datos. No modifica el sitio público ni los formularios
Auth/Cuenta. Los placeholders no afirman que una operación tuvo éxito.

Se reutilizan `Button`, `PendingButton` y `Spinner`: los formularios de alta,
edición, ajustes, anulación y actividad de proveedores ya los utilizaban y se
conservan. El Spinner existente respeta movimiento reducido y es decorativo;
el botón mantiene aria-busy, texto de acción y bloqueo del doble envío.

## Contenido esperado

Se crea `components/ui/skeleton.tsx`, pieza visual pequeña con animación discreta
y motion-reduce:animate-none. `components/admin/cargando-admin.tsx` compone
variantes listado, resumen, finanzas, detalle, imágenes, preview, formulario y
gráfico; reserva alturas/estructuras y anuncia la carga sin texto visible principal.
No hay timers ni duración mínima artificial. Los skeletons dependen del estado real.

| Superficie | Aplicación |
|---|---|
| Dashboard | loading.tsx del grupo panel, métricas/gráfico |
| Finanzas | loading.tsx propio; skeleton del gráfico antes de montarse |
| Productos | listado, nuevo/editar; consulta de galería y preview autorizada |
| Inventario | listado e historial de movimientos |
| Proveedores | listado; guardado/activación conserva PendingButton |
| Compras y Ventas | listado y detalle; comandos conservan PendingButton |
| Egresos | listado/detalle; registro y anulación conservan PendingButton |
| Imágenes | skeleton de consulta inicial de galería; Spinner en estados activos
  del uploader, conservando progreso XHR, procesamiento, retry y preview existentes |

`loading.tsx` queda dentro del layout autenticado, conservando shell/navegación.
El error inesperado del panel ofrece reintento; errores/vacíos/éxitos existentes
se preservan. Los skeletons no se mantienen al recibir un error.

## Acciones y filtros

`FiltroAdmin` y `BotonFiltrar` adaptan exclusivamente formularios GET existentes
de Compras/Ventas/Egresos y operaciones de Finanzas a navegación RSC con transición.
Conservan nombres/valores, validación nativa y funcionamiento GET sin JavaScript.
Durante la consulta se mantiene el contenido anterior y el menú; spinner solo en
el botón Filtrar, sin skeleton simultáneo. No se deshabilitan campos ni otros módulos.
El selector de período conserva su transición y añade Spinner discreto.

Búsqueda/filtros locales síncronos de Productos, Stock y Proveedores no muestran
una carga artificial. Uploader conserva progreso real: no se reemplaza por tiempos
simulados ni se modifica la cola o la lógica del proveedor.

## Evidencia y límites

- 154 pruebas focalizadas de shell, finanzas, cargas, productos, stock,
  proveedores, compras, ventas, egresos, preview y uploader. Incluyen pendientes,
  errores y recuperación ya existentes; nueve casos nuevos de estructura/accesibilidad
  y serialización de filtros.
- Navegación real en preview: 320/375/390/768/1440 px, sin 404, solapes ni overflow.
- Cargas reales desktop/mobile: transacción de preview con LOCK sobre egreso,
  sin DML. Se observa skeleton de listado/detalle y shell conservado; ROLLBACK
  libera la consulta y el contenido aparece. Filtro conserva contenido y muestra
  botón ocupado, sin skeleton. En movimiento reducido la animación resulta none.
- Transporte 503 controlado en un detalle: skeleton termina, error y reintento;
  la lectura normal posterior funciona. Ese fallo intencional no se presenta como
  error espontáneo del servidor. Recorridos normales sin pageerror/console.error.
- No se ejecutaron mutaciones reales de productos, compras, ventas, egresos o
  stock para demostrar un spinner: se reutilizan pruebas controladas de los comandos.
- Evidencia local ignorada: work/ux-final-carga-listado[-mobile].png,
  work/ux-final-carga-detalle[-mobile].png y work/ux-final-filtro-pendiente[-mobile].png.

Lint/TypeScript/build y diff-check forman parte del cierre técnico. La revisión
visual humana sigue pendiente; no se declara aceptación por pasar pruebas.
