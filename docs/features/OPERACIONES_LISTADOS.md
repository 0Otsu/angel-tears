# Filtros y paginación de Operaciones

## Alcance autorizado

Refinamiento solicitado por Augusto el 11/11/2026 sobre la rama actual, conservando
Gastos, Productos/Existencias y Finanzas/Dashboard pendientes de integrar. Ventas,
Compras y Gastos comparten ahora un patrón de filtros y navegación del historial.
Sin cambios de dinero, registro, anulación, stock, Auth, Finanzas o Dashboard.
No se modifican SRS/RUP ni se agregan dependencias o tablas.

## Diseño

- Los servicios anteriores tenían LIMIT+1 y hayMas, pero no offset/cursor ni UI
  que permitiera acceder al resto. Se completan los mismos métodos listar.
- 25 filas por defecto, límite técnico máximo 200, parámetros enteros validados.
  Página solicitada máxima 1.000.000 y normalización a la última existente antes
  de calcular offset; cero resultados se representa como página 1 de 1.
- COUNT en PostgreSQL y SELECT limitado a la página, ambos con iguales filtros.
  Los bordes administrativos conservan autorización previa y usan transacción
  READ ONLY REPEATABLE READ para que el total y las filas de cada petición tengan
  el mismo corte. Las transacciones de escritura permanecen intactas.
- ORDER BY fecha_operacion DESC, id DESC: desempate único y estable, independiente
  de fecha de carga. Los DTO amplían filtro pagina y metadata paginacion opcional
  por compatibilidad con consumidores/dobles anteriores; se conserva hayMas.
- Se elige LIMIT/OFFSET frente a cursor por el volumen de miles y la navegación
  numérica/total simple. No se mantiene una cadena de cursores ni snapshot entre
  peticiones; operaciones nuevas/anuladas pueden cambiar el total al navegar.
- Índices existentes: estado/fecha/id en las tres cabeceras; índices únicos de
  cabecera/número de línea cubren el recuento acotado de líneas. Sin estado, el
  prefijo del índice no cubre enteramente el orden: se mide con volumen antes
  de proponer otro índice/migración. No se afirma escalabilidad ilimitada.

## Filtros y UX

Este mes (predeterminado en las tres pantallas), Mes anterior, Todo el historial y
Elegir fechas. Mes calendario según Argentina, incluyendo cambio de año/bisiesto.
Estado Todos/Vigentes/Anulados conserva los valores técnicos de cada módulo.
El servidor traduce períodos a fechas de operación; enlaces anteriores con
desde/hasta siguen siendo compatibles, incluidos extremos abiertos.

Los selectores aplican automáticamente y vuelven a página 1. Desde/Hasta solo
aparecen en personalizado; no hay botón Filtrar. Un rango invertido se señala sin
enviar una consulta nueva. La transición conserva el contenido y muestra spinner
pequeño; fecha/período/estado se conservan en Anterior/Siguiente y al cerrar detalle.
La URL permite recarga/volver y no se trae el historial completo al cliente.

## Validación

- 11/11/2026: 104 pruebas unitarias/componentes focalizadas correctas en nueve
  archivos; luego se agregó y ejecutó un caso de compatibilidad del alias
  `/admin/egresos` con período/página (seis pruebas de ese archivo correctas).
  Total de casos distintos cubiertos: 105. Límites, parámetros inválidos,
  calendario argentino/bisiesto, filtros automáticos, reinicio de página,
  navegación, errores y autorización previa.
- 36 pruebas PostgreSQL focalizadas correctas en cuatro archivos: listados de
  volumen, consulta/anulación de Ventas y Compras y administración de Egresos.
  Destino exclusivo `angel_tears_operaciones_test`, validado por la guardia.
- Volumen: 2.003 operaciones por módulo, 6.009 en total, dentro de transacciones
  revertidas. Se recorrieron las 81 páginas de cada módulo comparando todos los
  IDs con el orden SQL esperado, sin repeticiones/omisiones. Fechas repetidas,
  anulados, rango/estado combinado, última página, página excesiva, cero resultados
  y parámetros inválidos. EXPLAIN ANALYZE BUFFERS de la lectura filtrada limitada;
  no se propone una migración de índices sin una necesidad medida en volumen real.
  No es un benchmark de producción.
- Navegador contra esa base aislada en puerto 3100: 58 operaciones por módulo
  (56 del mes, dos del anterior, 19 anuladas del mes), creadas con los servicios
  existentes. Páginas 1/2/3, filtros desde página 2, rangos personalizados,
  recarga, detalle/Escape/retorno de foco sin perder URL, resultados vacíos,
  parámetros inválidos y bloqueo sin sesión. Escritorio 1440px y móvil 390px sin
  desbordamiento horizontal ni errores JavaScript. Recorrido focalizado de lectura,
  sin suite E2E completa. Los E2E existentes de Ventas/Gastos se adaptaron al filtro
  automático conservando sus aserciones; no se ejecutó su suite transaccional.
- Fixtures y cuenta de ese recorrido retirados por IDs/actor controlados al
  finalizar; cero ventas, compras y egresos remanentes en esa base. La preview de
  presentación no recibió esos datos y los datos de Sofi no se modificaron.
  Cloudinary/correo desactivados en los procesos de prueba.
- Lint, TypeScript, OpenSpec strict/doctor y diff-check correctos. Build de
  producción correcto con `next build --webpack`: Turbopack falló resolviendo
  fuentes `next/font/google`. Se usó la alternativa sin modificar scripts,
  dependencias, tipografías ni configuración versionada.
- Preview en `http://localhost:3000`, conectada exclusivamente a
  `angel_tears_preview_20261111`. Smoke autenticado de los tres listados y alias
  correcto, sin registrar ni anular operaciones en esa preview.
- Capturas locales ignoradas: `work/listados-*-desktop.png` y
  `work/listados-*-mobile.png`; resultados/limpieza en `listados-ui-resultados.json`,
  `listados-ui-limpieza.json` y logs de checks bajo `work/`.

## Criterios y límites de entrega

- [x] Filtros comunes sin botón, fechas solo en personalizado, fecha de operación.
- [x] Consultas limitadas con parámetros validados y autorización sin cambios.
- [x] 25 filas iniciales, orden único, total, anterior/siguiente y filtros en URL.
- [x] Miles de registros comprobados en aislamiento y retirados al terminar.
- [x] Gastos conserva la integración visual y el servicio de Egresos existente.
- [ ] Aceptación visual final de Augusto e integración expresamente pendientes.

OFFSET no mantiene un snapshot entre clics: escrituras concurrentes pueden
desplazar filas entre páginas. Dentro de cada consulta, total y página comparten
snapshot. Un historial mucho mayor o navegación muy profunda puede justificar
cursor/otro índice posteriormente, sin adelantarlos en este alcance.
No se cambiaron resúmenes monetarios, transacciones de registro/anulación,
migraciones, permisos ni contratos de movimientos. Sin commit, merge ni push.
