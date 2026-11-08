# Inventario UX y Dashboard: criterio operativo unico

## Alcance autorizado y decision vigente

Rama fix/inventario-ux, base af3a992. Se preserva la evolucion UX local sin commits.
Sofi y el responsable aprueban umbral general tres para TODOS los productos:
0 Sin stock; 1, 2 o 3 Pocas unidades; 4 o mas Disponible. Se retiran la configuracion
individual de la experiencia administrativa y cualquier criterio paralelo de alerta.
No se cambian movimientos, reversas, idempotencia ni reglas de Compra/Venta.
No se modifican los siete productos reales, minimos persistidos o saldos.

## Una unica fuente, servicio y UI compatibles

lib/modulos/inventario/alertas-stock.ts contiene UMBRAL_GENERAL_STOCK = 3 y
clasificarStock. Inventario/presentacion/Resumen consumen esta regla pura, sin SQL
nuevo ni repetir el umbral. lib/presentacion/inventario.ts reexporta alias de los
nombres previos de UI; no tiene otra politica. esStockBajo usa la clasificacion:
true para cero a tres, false desde cuatro. Es una alerta inclusiva; la presentacion
separa cero (Sin stock) de uno a tres (Pocas unidades).

La firma esStockBajo(saldo,minimoLegado?) sigue aceptando llamadas previas de dos
argumentos; el segundo se ignora por decision comercial explicita. Administracion
lo llama con saldo. FilaStock conserva forma/campos/tipos, pero documenta la semantica
actual de stockBajo y minimo como legado. Es una actualizacion semantica autorizada,
no un cambio silencioso ni garantia de mantener la comparacion individual anterior.

Consumidores inspeccionados: administracion.consultar y sus pruebas, regla pura,
UI de Stock, presentacion y Resumen. El contrato compartido de disponibilidad
conserva minimo, saldo y hayStock sin alteracion; persistencia sigue retornando el
valor individual existente para compatibilidad de consumidores internos futuros.
No hay cambios a contrato.ts, persistencia.ts, ajustes.ts, schema ni migraciones.

## UI de Inventario y Dashboard

Microcopy final: se conserva Todo el inventario esta al dia y se retiran de ambas
vistas las explicaciones Criterio general y Sin alertas segun el criterio general.
No se agrega ayuda redundante. En el ajuste se conserva una aclaracion breve:
El stock se comprobara al guardar. La politica y la compatibilidad se explican aqui,
sin trasladar detalles tecnicos a la interfaz. Sin cambios de reglas ni filtros.

Refinamiento semantico: estado-stock.tsx centraliza la paleta de presentacion con
tokens Tailwind rose/amber y el badge oliva existente. Cero usa rosado, pocas usa
ambar; texto, iconos distintos y etiquetas permanecen. Indicadores en cero mantienen
el color con fondo atenuado; Total es neutro. Filas/tarjetas alertadas tienen fondo
apenas tenido y borde lateral, sin cambiar prioridad o consultas. Resumen reutiliza
badges/paleta y muestra check discreto cuando no hay alertas.
34 pruebas de componentes focalizadas correctas, incluidos limites 0/1/3/4,
etiquetas/clases, indicadores cero, orden de reposicion y accesos existentes.
Lint, TypeScript y diff-check correctos. Revision real desktop/mobile a 390px sin
desborde; contraste calculado con colores computados de badges claros rose/amber.
No se ejecutan ajustes ni se crean datos para demostrar colores. Se observan datos
actuales 7 productos, 1 sin stock y 2 con pocas unidades, diferentes de la lectura
7/0/0 anterior. Next permanece en localhost:3000, sin commits ni integracion.

Tarjetas total/sin stock/pocas con datos reales y tres columnas compactas en movil.
Lista ordenada por estado general y saldo, nunca por minimo o stockBajo legado.
Tabla desktop y tarjetas mobile con cantidades destacadas. Filtros: Todos,
Sin stock, Pocas unidades y Disponible; se elimina bajo individual. Un deep link
antiguo estado=bajo se normaliza a Todos como filtro retirado, sin tocar contratos.
No se muestra minimo ni una alerta secundaria contradictoria.

Modificar stock queda como unica accion primaria; menu secundario exclusivamente
Historial. Dialogo de minimo eliminado (sin mas importadores). Se reutiliza dialogo
historico con teclado/Escape/retorno de foco. No se elimina consulta de movimientos.

Agregar/Retirar mantienen comandos existentes y misma claveSolicitud para retry,
bloqueo contra doble envio/cierre pendiente, motivo obligatorio, errores y foco.
Saldo actual visible y estimacion inmediata al ingresar cantidad, sin exigir motivo.
La estimacion usa las reglas puras existentes y es provisional respecto de escrituras
concurrentes; el comando revalida bajo lock. Retiro mayor al saldo consultado bloquea
boton y handler. INICIAL sigue en backend/historia, no en el formulario simplificado.

Resumen consulta UNA vez obtenerAdministracionInventario().consultar(headers), con
guardia de pagina y autorizacion del servicio existentes. Misma fuente que Stock.
No hay metricas financieras/ventas ficticias; el pie de prototipo se oculta solo en
Resumen, igual que en las pantallas operativas reales. Enlaces usan estado=sin_stock
/ pocas; el filtro inicial se lee de searchParams y se sincroniza al navegar.
Sin alertas generales se muestra Todo el inventario esta al dia, conservando el
listado; base vacia y falla de consulta tienen mensajes distintos, nunca ceros falsos.

## Compatibilidad conservada y deuda tecnica

- inventario.minimo, restricciones y valores historicos permanecen intactos; no se
  ejecuta SQL para limpiar o reescribirlos. No determinan alertas ni prioridad.
- FilaStock.minimo y DisponibilidadProducto.minimo siguen presentes. No renombrar ni
  quitar campos sin inventariar consumidores y coordinar con Claudio/Emi.
- crearAdministracionInventario.cambiarMinimo y cambiarMinimoAccion se conservan como
  escritura interna legada compatible. El metodo esta deprecado, sin importador UI.
  Sus tests de validacion/autorizacion/persistencia se conservan: guardar ese dato
  no afecta alertas. No se cambia su funcionamiento ni se crea una API paralela.
- Una eventual retirada del endpoint/tipos/campos necesita una tarea coordinada
  posterior, no hace falta para esta decision operativa. No se requiere aprobacion
  adicional de Claudio para implementar el criterio que ya autorizo el responsable.
- REGLAS_DOMINIO, DECISIONES_PRODUCTO y OpenSpec registran la sustitucion explicita
  de B1/B2 respecto de alertas; no se inventan RF/CU ni se modifican fuentes SRS/RUP.

## Validacion y limites

74 pruebas unitarias/componentes focalizadas: limites 0/1/2/3/4 y transiciones
4->3->2->1->0->1->4; minimos historicos null/0/1/3/5/10 ignorados; conteos, filtros,
prioridad sin mutacion, enlaces Dashboard -> URL -> Stock, vacios y error, estimacion,
retiro insuficiente, motivo, retry, doble envio, menu y teclado/retorno de foco.
27 PostgreSQL focalizados de administracion en angel_tears_test, protegida por
validarUrlBdPruebas: nuevos limites y semantica con valores historicos preservados,
ademas de ajuste/minimo legado/historial/autorizacion existentes. Sin DB desarrollo.
Lint, TypeScript, OpenSpec strict y diff-check. No suites completas ni E2E masivos.
El E2E existente se adapta a UI sin minimos y transicion cuatro a tres; no ejecutado.

Revision final del 08/11/2026, tras recuperarse Docker Desktop: PostgreSQL responde
en 127.0.0.1:62075 y se repitieron las 27 pruebas de administracion en la base aislada
con resultado correcto. Tambien se repitieron 74 pruebas focalizadas, lint,
TypeScript y OpenSpec strict/doctor durante esta reanudacion.

En navegador con la sesion existente, Resumen e Inventario muestran siete productos,
cero sin stock y cero pocas unidades, y el mensaje Todo el inventario esta al dia.
El acceso Pocas unidades abre /admin/stock?estado=pocas con filtro correcto y sin
coincidencias; Limpiar filtros devuelve los siete registros. Tabla desktop revisada.
Menu abierto con Enter: solo Historial; consulta real completada, Escape cierra y
devuelve el foco a Mas acciones. Ajuste mobile: foco inicial en Agregar; cantidad uno
estima seis desde saldo cinco aun con motivo vacio; Retirar seis bloquea Registrar
ajuste. Escape devuelve el foco a Modificar stock. No se envio ningun ajuste.
Modal revisado a 390x844 y tarjetas a 320x740, sin desborde horizontal del documento.
Se restauro el viewport normal. Next y PostgreSQL quedan disponibles para revision
en localhost:3000/admin y /admin/stock, con la pestana de Inventario abierta.

No se crean descartables ni ajustes reales para mostrar alertas. Toda mutacion
probada ocurre en mocks o _test; no hay operaciones Cloudinary ni cambios Auth/
Proveedores/Compras/Ventas. No commit, merge ni push. El responsable declaro aprobada
la revision visual final; esto no marca aceptacion global ni integracion a main.

## Revision tecnica final del 08/11/2026

Rama fix/inventario-ux y HEAD af3a99279ca18518a09398af6c5a6b0856aeced3, iguales a
origin/main local y main remoto comprobado mediante git ls-remote (sin integrar).
Main local sigue en 47d94c1, seis commits atras: no es la base de esta tarea y no se
cambio de rama. No hay commits propios aun; 29 rutas en el diff: 20 seguidas
(incluye la eliminacion del dialogo de minimo) y nueve nuevas sin seguimiento.
No hay secretos, respaldos, work/, dependencias nuevas ni generados en ese alcance.

Build de produccion correcto y 81 pruebas unitarias/componentes focalizadas en siete
archivos correctas sobre el checkpoint final. Se reutiliza la evidencia vigente de
27 PostgreSQL de administracion en angel_tears_test (repetidas tras recuperar Docker),
lint y TypeScript de la pasada semantica. El build tambien verifica TypeScript.
OpenSpec strict: tres changes validos; doctor healthy; diff-check correcto. No E2E
ejecutado ni suites completas. Aviso no bloqueante del build: datos de
baseline-browser-mapping antiguos, sin actualizar dependencias fuera de alcance.

El titulo del ajuste es Asi quedara el stock. La estimacion reutiliza reglas puras;
el aviso de exito usa respuesta.saldoResultante y router.refresh vuelve a consultar
el listado. Servicio devuelve registrarAjuste.ajuste.saldoResultante, confirmado en
transaccion con lock por la persistencia existente. Test: preview quince, respuesta
doce, confirmacion doce y refresh; rechazo por saldo insuficiente conserva editor,
informa disponible real y no muestra exito. Retry conserva claveSolicitud. No se
cambian los comandos, transacciones ni deduplicacion para lograr esta garantia.

### Conciliacion de desarrollo: solo lectura

Destino verificado 127.0.0.1:62075 / angel_tears_dev. Conexion con
default_transaction_read_only=on, BEGIN READ ONLY y ROLLBACK. No se ajusto ni revirtio
ningun saldo en esta auditoria. Fechas en America/Montevideo. La historia muestra:

| Producto | Fecha/hora | Tipo | Delta | Saldo confirmado | Motivo |
| --- | --- | --- | --- | --- | --- |
| Pulseras Aghata | 07/11/2026 16:45:48 | INCREMENTO | +12 | 12 | s |
| Pulseras Aghata | 08/11/2026 12:26:25 | DECREMENTO | -12 | 0 | x |
| Aros Butterfly | 07/11/2026 15:34:03 | INCREMENTO | +10 | 10 | pq si |
| Aros Butterfly | 08/11/2026 12:27:37 | DECREMENTO | -7 | 3 | c |
| Combo Moonlight | 07/11/2026 16:42:38 | INCREMENTO | +6 | 6 | s |
| Combo Moonlight | 08/11/2026 12:27:06 | DECREMENTO | -2 | 4 | x |
| Combo Moonlight | 08/11/2026 12:27:15 | DECREMENTO | -1 | 3 | x |

Los siete movimientos son ORIGINAL, ninguno REVERSA; suma de deltas coincide con
inventario.cantidad en los tres productos. Versiones actuales: Pulseras 3, Aros 3,
Combo 4; minimo null en los tres. Esto verifica consistencia, no atribuye autoria
humana de los ajustes ni demuestra quien interactuo con el navegador.

### Compatibilidad y propuesta de integracion

Las puntas publicadas de inventario-reversas, stock-ui-real,
inventario-proveedores-compras y proveedores-ui-real no tienen commits fuera del
main comprobado. No hay conflicto con main actual; cambios locales o no publicados
de Claudio/Emi no son verificables. Antes de integrar volver a comprobar main.
Archivos susceptibles de trabajo concurrente: administracion.ts, reglas-stock.ts,
administracion-contrato.ts, sus tests y OpenSpec de Inventario. Comunicar el cambio
semantico de stockBajo (0..3) y retirada de minimo en UI; forma de DTO permanece igual.
Los metodos/campos legados de minimo siguen internos, sin eliminacion de datos.
Contrato de movimientos/reversas, persistencia.ts, ajustes.ts, schemas, migraciones,
Auth, Proveedores, Compras y Ventas no tienen diff. Tampoco package/lock.

Commit propuesto (no creado):
feat(inventario): unificar alertas y mejorar UX de stock y resumen

### Rutas que componen el cambio

Paginas:
- app/admin/(panel)/page.tsx
- app/admin/(panel)/stock/page.tsx
- app/admin/(panel)/inventario-ux.test.ts (nuevo)

Componentes:
- components/admin/stock-admin.tsx y stock-admin.test.tsx
- components/admin/resumen-admin.tsx y resumen-admin.test.tsx (test nuevo)
- components/admin/resumen-alertas-stock.tsx (nuevo)
- components/admin/estado-stock.tsx (nuevo)
- components/admin/acciones-secundarias-stock.tsx (nuevo)
- components/admin/dialogo-ajuste-stock.tsx
- components/admin/dialogo-historial-stock.tsx
- components/admin/dialogo-minimo-stock.tsx (eliminado)
- components/admin/estructura-admin.tsx y estructura-admin.test.tsx

Regla y presentacion:
- lib/modulos/inventario/alertas-stock.ts (nuevo)
- lib/modulos/inventario/reglas-stock.ts y reglas-stock.test.ts
- lib/modulos/inventario/administracion.ts
- lib/modulos/inventario/administracion-contrato.ts (solo comentarios)
- lib/modulos/inventario/administracion.integracion.test.ts
- lib/presentacion/inventario.ts e inventario.test.ts (nuevos)
- e2e/stock-real.spec.ts (adaptado, no ejecutado)

Documentacion:
- docs/features/INVENTARIO_UX.md (nuevo)
- docs/DECISIONES_PRODUCTO_MVP.md
- docs/REGLAS_DOMINIO.md
- openspec/changes/implement-inventory-suppliers-purchases/specs/inventario/spec.md
- openspec/changes/implement-inventory-suppliers-purchases/tasks.md
