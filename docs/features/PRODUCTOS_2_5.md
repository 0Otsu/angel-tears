# Producto 2.5: experiencia administrativa de Productos

## Fuentes y alcance

Pedido expreso del responsable del 01/11/2026, RF-04/05/06/07 de la SRS vigente ya referenciada en 2.1-2.3; CU exactos pendientes de formalizacion RUP. Reutiliza CRUD, imagen/Cloudinary y publicacion de 2.1-2.4. Base `388a7bdb4396abdad2a6e3a903e50d9da5a018da`, rama nueva `feature/productos-2-5-admin`. No nuevos requisitos comerciales, Auth, stock, categorias editables, galeria o borrado fisico.

## Comportamiento y decisiones

- `/admin/productos`: listado persistido primero, CTA Nuevo producto, empty state propio, busqueda por nombre y filtros categoria/estado en el conjunto consultado. Filas/cards adaptables con imagen/placeholder, nombre/categoria/precio/visibilidad/destacado. No stock duplicado. Menu Radix existente con teclado, foco, nombre contextual y acciones Editar/Cambiar imagen/Publicar-Ocultar/Destacar-Quitar destacado, sin eliminar.
- `/admin/productos/nuevo`: datos requeridos/opcionales existentes y Guardar y continuar. Crea oculto+C0 mediante el servicio existente; navega al ID guardado para imagen, sin reenvio automatico del alta.
- `/admin/productos/[id]/editar`: secciones Datos/Imagen/Finalizar. El alta continua en Imagen; puede omitirla y finalizar como oculto. Resumen con imagen/datos/estado, publicacion deshabilitada sin imagen y validacion definitiva en el servicio real. Guardar como oculto tambien usa la accion real versionada. Los comandos muestran feedback propio, sin SQL/stack ni exito ficticio.
- Datos e imagen permanecen montados al cambiar de seccion: no se pierde borrador. Solo eventos de operaciones propias actualizan el snapshot/version del editor; una recarga RSC ajena no adopta silenciosamente versiones nuevas sobre datos antiguos. Callback de imagen confirmada avanza version sin borrar entradas; edicion posterior usa esa version. Navegacion entre secciones bloqueada durante guardado/upload. Conflicto o confirmacion incierta ofrece recarga explicita del editor; conserva entradas hasta esa decision.
- Primera carga/reemplazo reutilizan componente, decoder, adapter y Handler existentes. No cambia su modelo. Menu dentro del editor cambia de seccion sin remount; menu del listado navega a rutas dedicadas. Rutas nuevas exigen guard real por pagina; consulta individual parametrizada filtra Producto y conserva autorizacion previa a leer. Error de consulta es recuperable, inexistente valido es 404. Shell solo reconoce las subrutas de Productos como parte de su modulo persistido; sin redisenar otros modulos.
- Precio ya aceptaba enteros y uno/dos decimales. `222`, `222.5`, `222.50`, `12500`, `12500.99` comprobados. La captura mostraba entrada no numerica `f222`. Sin cambiar precision ni politica >0/ARS: se retira numeric(18,2) del mensaje visible y se explican decimales opcionales. Sin redondeo ni floats.

## Aceptacion y pruebas

Unit/component: empty state/CTA/filtros, alta y errores/foco/entradas conservadas, snapshot ante cambio ajeno, version tras imagen con borrador conservado, publicacion real invocada con version vigente y bloqueo sin imagen. Casos explicitos de precio entero/decimal y rechazo de invalidos sin mensajes tecnicos.

E2E Next/DB aislada: alta dedicada, guardar oculto, edicion y slug/precio/C0 persistidos, permisos/sesion/origen/stale, seleccion/preview/cancel/retry de imagen sin proveedor remoto, menu por teclado, rechazo de publicar sin imagen, destacar/quitar destacado. Desktop/notebook/mobile y ausencia de overflow. Se actualizan selectores de la tabla anterior a las nuevas rutas sin quitar comprobaciones de persistencia. Regresion Publico/SEO conservada.

Smoke real adicional sobre producto descartable, administradora/sesion reales y Cloudinary configurado, sin imprimir secretos: alta, imagen A, resumen/Publicar producto y Destacar desde UI, reemplazo A a B, borrador material conservado y guardado posterior con version 6 sin conflicto artificial. Admin API confirma A destruida y B unica; delivery B 200/bytes originales, PDP/OG usan B; ocultacion desde menu real devuelve PDP 404. Cleanup del producto/saldo y assets del smoke, con todas las filas Producto/Inventario previas/posteriores coincidentes; fixtures intactos. Script/evidencia local ignorados en `work/`, sin credenciales versionadas.

Capturas revisadas en `work/productos25-{vacio,listado,nuevo,editar}-{desktop,mobile}.png`: flujo simple, identidad existente, sin tabla horizontal obligatoria en mobile; labels/estados visibles, menu accesible y aria-live. No equivale a auditoria WCAG completa ni cierre de rendimiento 4.4.

## Limites y continuidad

Sin cambios de schema/migrations/dependencias, contrato compartido ProductoInterno, Auth o logica de Inventario. Se mantienen riesgos operativos de conciliacion de imagenes documentados en 2.3. No hay seed automatico ni demo productiva. Dominio/contenido/dataset, entrega optimizada/CWV de 4.4 y aceptacion integral 5.x siguen pendientes. La regresion de importes historicos de 2.1 depende aun de Compras/Ventas persistidas.

## Checks de cierre

324 unitarias/componentes, 161 PostgreSQL y 20 E2E combinados correctos. Lint/typecheck y build de produccion (arnes E2E), db:check/db:generate sin cambios (11 tablas), OpenSpec strict/doctor y diff-check correctos. Las primeras corridas detectaron selectores de la tabla anterior y una competencia refresh/navegacion al finalizar: se corrigieron los selectores conservando aserciones SQL y el codigo de navegacion (push al salir, refresh solo al permanecer). La corrida final completa 20/20 valida la correccion; no se omiten tests.

2.5 completa. 4.4 parcial y 5.x abiertas. Quedan entrega responsive de imagenes/CWV reales, dominio y contenido comerciales/dataset demo explicito, regresion historica con Compras/Ventas persistidas y aceptacion integral. No se adelantan esas tareas en este cierre.
