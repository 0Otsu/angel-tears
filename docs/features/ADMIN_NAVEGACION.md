# Navegacion agrupada del panel

## Fuente, alcance y decisiones

Pedido expreso del responsable del 02/11/2026, base `51dcdde65a3c813a56268713553d7c1d8721183a`, rama `fix/admin-navegacion-agrupada`. Cambio del shell/arquitectura de informacion, sin nuevos RF/CU ni capacidades comerciales. Trazabilidad canonica conserva pendientes existentes; blueprint seccion 8 actualizado con esta decision. Sin cambios a reglas, servicios, persistencia, contratos, dependencias, fixtures o migrations.

Antes: diez destinos principales (Resumen, Productos, Stock, Proveedores, Compras, Ventas, Egresos, Reportes, Cuenta y Configuracion). Ahora: cinco (Resumen, Productos, Inventario, Operaciones y Finanzas).

- Resumen sigue siendo dashboard mock, no pantalla operativa general. Productos conserva rutas/componentes/logica.
- Inventario conserva `/admin/stock`; solo cambia nombre visible/metadato y texto del acceso rapido.
- Operaciones abre Ventas (`/admin/ventas`), con enlaces secundarios Ventas/Compras/Proveedores a sus rutas actuales. Sin landing nueva, carpeta de operaciones o mega-pagina.
- Finanzas abre `/admin/finanzas`, reutilizando `ReportesAdmin` y sus fixtures sin consultas nuevas. Su titulo es Resumen financiero. Egresos conserva `/admin/egresos`; ambos muestran subnavegacion comun. `/admin/reportes` exige sesion y redirige a Finanzas, sin exponer datos antes de autorizar.
- Mi cuenta aparece en el menu de identidad del header (tambien mobile), con la ruta real `/admin/cuenta`. El logout reutiliza el mismo componente/handler y solo agrega variante presentacional de menu; un fallo mantiene error visible. Se conserva logout al pie del sidebar/drawer.
- Configuracion conserva `/admin/configuracion`, sin enlace principal. No modo oscuro, preferencias o configuracion nueva.

## Criterios verificables

- [x] Cinco enlaces principales; estado activo por ruta/area con aria-current y marcador, ademas del color.
- [x] Subnavegacion con enlaces nativos, destino actual subrayado/aria-current y targets de 44 px; responsive sin scroll horizontal.
- [x] Menu de usuario Radix reutilizado, nombre accesible, teclado y Escape con retorno del foco; Cuenta/logout reales.
- [x] Deep links anteriores conservados y nuevo acceso Finanzas protegido. Ninguna carpeta de Claudio/Emiliano movida ni backend Auth modificado.

## Pruebas y limites

RTL del shell/estado activo, regresion del boton de logout, guard de todas las paginas y formularios existentes afectados por la navegacion. E2E contra Next produccion y PostgreSQL aislado: navegacion a 320/390/768/1440, drawer que cierra al elegir, teclado/foco/menu de usuario, rutas anteriores/redirect, Cuenta/logout/proteccion y Productos. Axe sobre header/sidebar/subnavegacion; capturas locales ignoradas en `test-results/navegacion-admin-*`. No auditoria nueva de los graficos mock ni implementacion funcional de esos modulos.

No suite PostgreSQL completa: no se modifican dominio ni persistencia. Build/typecheck/lint y OpenSpec/diff como checks tecnicos. No se cierran 5.x, Finanzas, Dashboard real, security o deploy por este cambio de navegacion.

Resultado de cierre: 60 unit/component focalizadas, 33 E2E (Cuenta, navegacion, proteccion y Productos) y dos E2E de navegacion repetidos con build final tras los ultimos ajustes de copy. Lint/typecheck/build/OpenSpec strict/doctor/diff correctos. Revision visual de capturas a 320/390/768/1440, sin desborde ni infracciones axe del shell. Cuenta/menu usan el logout existente, tambien ante fallo, sin modificar su handler. La rama se integra por merge normal, sin force.
