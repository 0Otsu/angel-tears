# Finanzas y Dashboard reales

## Fuentes y alcance

RF-19 (consulta de Compras/Egresos diferenciados) y RF-21 (resultado económico)
del [SRS vigente](https://docs.google.com/document/d/1SugCvtS4De8LImkAEiis5pGWY8Eg99TgWIXzBWMS72w/edit),
confirmado por Augusto el 10/11/2026. Reglas de dominio, decisiones G/H,
blueprint §6–7 y ADR-003/005/006/008. No se agregan RF/CU ni se modifican SRS/RUP.
Propuesta, diseño y criterios en [implement-finance-dashboard](../../openspec/changes/implement-finance-dashboard/proposal.md).

Se sustituyen los mocks de `/admin/finanzas` y se agregan indicadores de operaciones
a `/admin`. Inventario conserva consulta, umbral 3, orden, colores y enlaces.
Sin cambios a registro/anulación de Ventas, Compras o Egresos; tampoco a Productos,
Inventario, Auth, Cloudinary, schemas, migraciones, paquetes o configuración.

## Comportamiento

- Dashboard: mes actual automático en America/Argentina/Cordoba, sin filtros.
  Finanzas: rango visible (inicialmente mes actual) o año completo validado.
  Siempre fecha de operación, nunca fecha de carga. Sin acceso «Hoy» no aprobado.
- Ventas vigentes − Compras vigentes − Egresos manuales vigentes, con cantidades e
  importes separados. Anulados excluidos; una Compra no se crea ni se suma como egreso.
- Cero real, positivo y negativo; centavos bigint y texto decimal firmado,
  incluso al superar el entero seguro de JavaScript. Resultado de gestión, no ganancia contable.
- Evolución exclusivamente desde operaciones vigentes persistidas: por día hasta
  92 días de separación entre extremos; por mes para rangos mayores. No puntos ficticios.
  Una fecha presente en otra fuente puede tener cero real en la fuente sin operaciones.
- Tabla accesible con importes exactos equivalente al gráfico. Number solo posiciona
  barras/ejes de Recharts; no calcula totales y el tooltip conserva el texto exacto.
- RF-19: compras/egresos diferenciados, filtros de tipo/estado, anulaciones identificadas
  y accesos a cada módulo para detalle/historia. Hasta 50 operaciones más recientes;
  se informa si hay más. Ese límite no afecta resúmenes ni evolución.
- Fallos por fuente explícitos, sin cero engañoso. Si falta una fuente, resultado y
  gráfico conjunto no disponibles; fuentes sanas e Inventario se conservan.
  Reintentar recarga el período y los filtros elegidos. Sesión siempre exigida en servidor.
- Filtros y tarjetas móviles, tabla desktop; controles nativos con etiquetas,
  errores asociados, foco visible y navegación por teclado. Sin dependencia nueva.

## Reutilización y consistencia

`lib/modulos/finanzas/aplicacion.ts` compone autorización y lectura;
`agregacion.ts` comparte cálculo con ambas páginas; `periodo.ts` valida fechas.
`lectura.ts` delega en `resumirVentas`, `resumirCompras` y `resumirEgresos`, las consultas
existentes detrás de `obtenerAdministracion*.resumir`. Se reutiliza la estructura de
sus contratos, incluyendo cantidad/total vigente y cantidad anulada.

No se llaman los tres métodos administrativos con conexiones independientes:
el blueprint exige un mismo corte y sus composiciones actuales no admiten recibir
la transacción del consumidor. La autorización se exige antes de llamar las lecturas
internas, que sí aceptan el ejecutor. Una transacción READ ONLY REPEATABLE READ con
savepoint por fuente garantiza coherencia y recuperación tras error SQL sin modificar
los módulos fuente. Dashboard presenta evolución del mes y usa la misma agregación.
No hay caché pública ni escrituras desde Finanzas.

## Evidencia ejecutada, 10/11/2026

- 78 pruebas focalizadas unitarias/componentes/páginas en siete archivos:
  agregación/períodos/errores, Finanzas, Dashboard/Inventario, shell y guard de páginas.
- 10 pruebas PostgreSQL en `lib/modulos/finanzas/lectura.integracion.test.ts`:
  exactitud, anulados, sin doble conteo, extremos inclusivos, carga posterior,
  agrupación mensual, vacío, filtros/historia acotada, coherencia entre vistas,
  importes grandes y autorización. Escritura concurrente entre fuentes conserva
  snapshot; segunda lectura ve el commit. Error SQL real se recupera mediante savepoint.
- Dos E2E de `e2e/finanzas-real.spec.ts`: Chromium a 1440×1000 y 390×844,
  servidor de producción en 3100 con `DATABASE_URL_TEST` validada y Cloudinary vacío.
  Login/protección, ambas páginas, gráfico real, consulta diferenciada/anulados,
  filtros, vacío, negativo, fechas inválidas, teclado y ausencia de overflow horizontal.
- Fixtures de cabeceras exclusivamente en la base aislada, eliminados al finalizar.
  Prueban proyecciones financieras; no sustituyen pruebas de registro/líneas/stock
  de los módulos fuente. No se crean fixtures en desarrollo.
- Build normal `pnpm build` correcto, lint y TypeScript correctos.
  OpenSpec strict/doctor y diff-check registrados en el cierre de esta rama.
  No suites completas ni E2E masivos.

El primer build y su alternativa Webpack fallaron con URLs sin extensión de Google
Fonts/Playfair Display; el build normal pasó al reintentar sin modificar fuentes,
dependencias ni configuración. Coincide con [Next.js #99114](https://github.com/vercel/next.js/issues/99114).
Los E2E reutilizaron el build normal ya comprobado mediante configuración local ignorada
`work/playwright-finanzas.config.ts` (mismo guard/entorno del arnés, solo omite reconstrucción).
El primer recorrido detectó una suposición incorrecta del test sobre Tab en un date
nativo; se corrigió para respetar sus segmentos. No se quitó la comprobación de teclado.

Capturas locales revisadas por el agente, con datos controlados **de pruebas**:

- `test-results/finanzas-real-finanzas-per-1eac5-dores-coherentes-en-desktop-chromium/finanzas-desktop.png`
- `test-results/finanzas-real-finanzas-per-1eac5-dores-coherentes-en-desktop-chromium/dashboard-desktop.png`
- `test-results/finanzas-real-finanzas-per-0612b-adores-coherentes-en-mobile-chromium/finanzas-mobile.png`
- `test-results/finanzas-real-finanzas-per-0612b-adores-coherentes-en-mobile-chromium/dashboard-mobile.png`

No equivalen a aceptación visual humana ni a validación con operaciones reales de Sofi.

## Base de desarrollo: inspección solamente

Conexión verificada sin imprimir credenciales: `127.0.0.1:62075 / angel_tears_dev`.
Lecturas con transacción READ ONLY. El journal aplicado reconoce **0000–0002**;
0003–0006 no aparecen aplicadas y las tablas `venta`, `compra` y `egreso` no existen.
No se asume que falta únicamente 0006 ni se intenta corregir el esquema automáticamente.
Pruebas usan `angel_tears_test`, actualizada por el arnés protegido existente.

Respaldo disponible: `angel-tears-dev-antes-limpieza.dump`, 07/11/2026,
43.401 bytes, SHA-256 `3d0002ace6373ac1ae91c022a05f0de065446f4fb0cb791795fc8599f2a0c41b`.
Archivo/hash/índice `pg_restore --list` verificados. No se restauró y no constituye
un snapshot reciente del estado actual; requiere nuevo respaldo antes de actualizar desarrollo.
No se aplicó ninguna migración, limpieza ni escritura en desarrollo o Cloudinary.

`pnpm db:check` correcto y `pnpm db:generate` respondió «No schema changes,
nothing to migrate»: sin cambios nuevos de esquema ni migraciones generadas/aplicadas.

## Archivos del diff

El inventario inicial del diff fue de 28 archivos; la corrección posterior añade
la señalización de preview en `app/layout.tsx` y conserva el generado `next-env.d.ts`.
Sin staging ni commits:

- Páginas: `app/admin/(panel)/page.tsx`, `finanzas/page.tsx`, `finanzas/page.test.ts`
  e `inventario-ux.test.ts` (se agrega el doble de la nueva consulta del Dashboard).
- UI: `components/admin/reportes-admin.tsx`, `resumen-admin.tsx`, `estructura-admin.tsx`
  (solo retirar aviso demo de Finanzas), `filtro-periodo-finanzas.tsx`,
  `indicadores-finanzas.tsx`, `evolucion-finanzas.tsx`, `salidas-finanzas.tsx`
  y `finanzas-admin.test.tsx`.
- Lectura/reglas: `lib/modulos/finanzas/{contrato,periodo,agregacion,lectura,aplicacion}.ts`,
  `agregacion.test.ts`, `lectura.integracion.test.ts`; presentación en
  `lib/presentacion/finanzas.ts`.
- Pruebas: `pruebas/datos-finanzas.ts`, `e2e/finanzas-real.spec.ts`.
- Documentación: este archivo, enlace de seguimiento RF-19 en `EGRESOS.md` y los
  cuatro artefactos propios de `openspec/changes/implement-finance-dashboard/`.

Los módulos fuente, schemas, migraciones, dependencias, secretos y archivos generados
no forman parte del diff. `work/` y `test-results/` permanecen ignorados.

## Criterios y pendientes

- [x] RF-19: consulta conjunta diferenciada, por período, con historia excluida de vigentes.
- [x] RF-21: resultado exacto, rangos, vacío/negativo y fuentes independientes coherentes.
- [x] Dashboard real preservando íntegra la sección operativa de Inventario.
- [x] Verificación automatizada focalizada y capturas desktop/mobile.
- [ ] Aceptación visual/funcional humana de esta contribución e integración Git autorizada.
- [ ] Respaldo reciente, inspección del desfase 0003–0006 y autorización separada para desarrollo.
- [ ] Aceptación E2E transversal del proyecto, seguridad/deploy y cierre operativo posteriores.

El gráfico específico de `/admin/ventas` (RF-16/CU-13) sigue siendo una tarea separada.
Esta contribución no lo cierra ni agrega funciones de Ventas. La revisión de estos
resultados no implica declarar terminado todo el proyecto.

Propuesta de commit: `feat(finanzas): conectar resultados reales y resumen operativo`.
Rama `feature/finanzas-dashboard`, base `4545c07`; sin commit, merge ni push en esta tarea.
## Corrección posterior a revisión humana — 11/11/2026

La experiencia anterior no fue aceptada. Se elimina el selector del Dashboard:
mes actual de Argentina y gráfico persistido. Finanzas ofrece fechas visibles
y año completo; conserva validación, exactitud y exclusiones de anulados.

Las tres fuentes se diagnosticaron individualmente en desarrollo con lecturas:
SQLSTATE 42P01 (tablas venta/compra/egreso ausentes). Egresos oculta su CTA cuando
falla la carga: no era un defecto de registro ni una razón para reimplementar el módulo.
Se conserva intacta esa lógica y se verificó su flujo con esquema completo.

Para revisión local se creó `angel_tears_preview_20261111` en 127.0.0.1:62075,
independiente tanto de desarrollo como de angel_tears_test. Migraciones 0000–0006
aplicadas ordenadamente desde cero; no se copiaron ni repararon registros de desarrollo.
No se tocó su historial inconsistente de 0003. Se conservan sus siete productos reales.

La preview tiene tres productos DEMO, cuatro compras (una anulada), cinco ventas
(una anulada) y egresos de dos meses, incluyendo anulados. Compras/Ventas se cargaron
con sus servicios transaccionales y líneas/movimientos reales; Egresos con su servicio.
No se replican compras como egresos manuales. Solo estas operaciones de preview
modificaron su Inventario; la base original permanece intacta.

localhost:3000 usa temporalmente esa preview mediante entorno del proceso, sin
editar .env.local. Banner persistente identifica la demostración, cuenta separada
con autenticación normal; acceso guardado en `work/acceso-preview-local.txt`, ignorado.
Cloudinary y Resend vacíos en ese proceso para evitar servicios reales. Scripts,
credenciales locales y capturas en work/ no se incluyen en Git.

Nueva evidencia: pruebas focalizadas, 10 PostgreSQL y 4 E2E Finanzas/Egresos
contra base test protegida. Build, TypeScript y lint. Navegación adicional real en
preview: rango/año/vacío, Dashboard sin filtros y con gráfico, registro/detalle/
anulación de Egresos, teclado/mobile; sin errores pageerror ni errores SQL/Next en
su log. Importes del mes: ventas 75.000, compras 75.000, egresos 4.300,50,
resultado -4.300,50. Pruebas UI descartables quedan anuladas y excluidas del resultado.
Capturas revisadas: `work/dashboard-preview-{desktop,mobile}.png` y
`work/finanzas-preview-{desktop,mobile}.png`.

Esta preparación no autoriza migrar desarrollo ni equivale a aceptación visual humana.
El respaldo original del 07/11 sigue sin ser un snapshot reciente de desarrollo.
La preview permanece activa para revisión; volver a desarrollo exige reiniciar Next
sin las variables temporales. No hay commit, push ni merge.
## Refinamiento de selectores y gráficos — 11/11/2026

Reemplaza la propuesta anterior de rango/año como UI principal (no aprobada).
Finanzas: control integrado Semana/Mes/Año, anterior/siguiente y vuelta al período
actual, con actualización por navegación RSC sin formulario de confirmación. Al
cambiar de duración dentro del período actual se usa la fecha actual de Argentina;
en períodos históricos se toma su inicio. Se conservan parámetros antiguos de
rango/mes/año como compatibilidad de enlaces, sin mostrar sus formularios.

Semana: lunes-domingo y siete días. Mes: semanas lunes-domingo recortadas al mes
(incluye parciales al principio/final). Año: doce meses. `intervalos.ts` centraliza
los límites, etiquetas y sumas bigint exactas. Los intervalos vacíos no representan
operaciones inventadas y se identifican como sin operaciones registradas.

Barras comparan Ventas con Salidas apiladas (Compras + Egresos manuales).
Tooltip de teclado/flechas y tabla accesible incluyen fechas, tres fuentes,
salidas y resultado exactos. Number solo posiciona coordenadas de Recharts.
Dashboard conserva tarjetas del mes actual e Inventario; su selector Por día /
Por semana cambia solo la proyección del gráfico, inicialmente semanal.

Validación de esta pasada: 54 pruebas focalizadas puras/componentes/páginas,
TypeScript, lint, build y diff-check. Verificación de lectura exclusivamente en
angel_tears_preview_20261111: 7 días/30 días/6 semanas/12 meses; suma de cada fuente
idéntica a sus tarjetas en centavos, con anulados excluidos. Navegación real en
Chromium desktop/mobile con autenticación normal: tres períodos, navegación,
vacío, gráfico diario/semanal, tarjetas invariantes y tooltip con flechas; cero
pageerrors. No se ejecutó integración ni E2E contra angel_tears_test en esta pasada.
No se escribieron datos de negocio de preview ni se consultó/modificó desarrollo.

Componentes afectados en esta iteración: filtro-periodo-finanzas,
evolucion-finanzas, resumen-admin, reportes-admin; tipos/período/intervalos,
pruebas focalizadas y guion E2E adaptado (su nueva versión no se ejecutó contra test).
Sin nuevas dependencias ni cambios en ChartContainer/Recharts, fuentes de negocio
o migraciones. Capturas actuales revisadas en work/periodos-{finanzas,dashboard}-{desktop,mobile}.png.
La preview continúa activa en localhost:3000; aceptación visual humana pendiente.
## Última pasada de usabilidad y cargas administrativas

Cambios UI posteriores a revisión humana, conservando rama y diff previos:
- Ingresos/Salidas como dos columnas; Salidas suma Compras + Egresos con dinero
  exacto. Desglose en un panel bajo el gráfico, accesible con teclado y tacto,
  sin popup que cubra controles. Fechas de un día se muestran una sola vez.
- Mes: etiquetas con fechas reales, partidas en dos líneas (1 nov., 2–8 nov.).
  Diario: ventanas navegables de siete días; las tarjetas y la tabla siguen
  incluyendo el mes completo. Año: etiquetas adaptativas sin omitir barras.
- Eliminados los subtítulos genéricos de Dashboard/Finanzas y «Tu negocio» del
  sidebar. Se conservan contexto del período, fórmula, alcance de gestión,
  validaciones y confirmaciones. «Ver tienda» es un botón secundario único,
  con href=/, visible y accesible en móvil/escritorio.

404 reproducido mediante HTTP: /admin/finanzas, /admin/egresos y /admin/stock
respondían 404 sin ejecutar su guard, pese a existir los archivos y los href
correctos. / y /admin respondían. Se reinició el proceso Next de preview sin
cambiar rutas: volvieron a 307 sin sesión y 200 autenticadas. Estado obsoleto
del servidor de desarrollo; no se ha demostrado el disparador interno exacto.
El build posterior no reprodujo el fallo. No se inventa un href incorrecto ni
se atribuye a responsive. Verificación Playwright estricta de menú móvil,
Finanzas↔Egresos, entrada directa, recarga y Ver tienda→/, sin 404.

Se añadió la capa de cargas descrita en [UX_CARGAS_ADMIN.md](UX_CARGAS_ADMIN.md).
154 pruebas focalizadas en 12 archivos correctas; matriz real en preview a
320/375/390/768/1440 px (ejes sin solapes, sin overflow, importes invariantes,
controles y detalle accesibles). Pruebas de demora real con locks de lectura
controlados en preview, siempre liberados con ROLLBACK, sin DML. Fallo HTTP 503
provocado únicamente en navegador para verificar error y reintento, sin cambios SQL.
No se ha probado ni modificado angel_tears_dev ni bases de tests en esta pasada.
Las capturas work/ux-final-{dashboard,finanzas}-{desktop,mobile}.png son actuales;
work/ux-final-diario-320.png muestra la ventana diaria. La aceptación humana
sigue pendiente. No commit, push ni merge.

## Adaptación visual de la referencia v0 — 11/11/2026

Referencia inspeccionada en modo lectura: `diseno-dashboard-angel-tears-main.zip`
del Escritorio de OneDrive; copia de Downloads idéntica. SHA-256:
`E94C3F13B28AFEC1C830BD3B8E6686DA6B89D802F27E27FAC07A2B91ECF6E832`.
No se ejecutaron scripts ni se instalaron paquetes del ZIP. Solo contiene una
variante de Dashboard, con métricas incorrectas: se descartaron Pedidos activos,
Ticket promedio, 148 productos y todos sus datos/reglas de ejemplo. No contiene
capturas: la comparación fue contra la composición de su código, no contra una
referencia visual ausente. Los originales permanecen intactos.

Se adoptó la jerarquía de tarjetas compactas, gráfico y panel lateral, usando los
componentes y tokens existentes. Dashboard conserva las cuatro cifras reales del
mes argentino, cuadrícula móvil 2×2 y gráfico con Inventario a la derecha en
escritorio. Finanzas destaca primero Resultado económico, luego las tres fuentes,
gráfico, desglose de salidas y movimientos. Los controles Semana/Mes/Año, las
ventanas diarias, filtros tipo/estado, anulados y enlaces de consulta se conservan.
El desglose presenta los totales ya consultados y suma centavos bigint; no abre
otra consulta. El único cambio nuevo del shell elimina los breadcrumbs; se
preservan sus cambios previos, marca, navegación, cuenta y Ver tienda.

Descartados: shell alternativo, identidades ficticias, datos estáticos, importes
float, períodos limitados artificialmente, estilos globales, package/lock/config,
Analytics y configuración que ignora errores de TypeScript. No se copiaron
servicios remotos, secretos ni HTML dinámico del proyecto externo. Sin cambios
nuevos en Auth, fuentes de negocio, Inventario, schema o migraciones.

Archivos de esta adaptación: `resumen-admin`, `reportes-admin`,
`indicadores-finanzas`, `evolucion-finanzas`, `filtro-periodo-finanzas`,
`salidas-finanzas`, `desglose-salidas`, `cargando-admin`, `estructura-admin` y sus
pruebas `finanzas-admin.test.tsx`/`estructura-admin.test.tsx`; esta evidencia y
el diseño del change. El resto del diff acumulado pertenece al trabajo anterior
de Finanzas y cargas administrativas y se preserva sin staging.

Validación focalizada: 102 pruebas en nueve archivos, incluyendo agregación,
intervalos, páginas, guards y componentes. Lectura de PostgreSQL exclusivamente
en `angel_tears_preview_20261111`: días/semanas/meses coinciden con los totales
exactos y excluyen anulados. Navegación autenticada en Chromium a
320/375/390/768/1440 px: menú, Finanzas↔Egresos, recarga, Ver tienda, tres períodos,
teclado en gráfico, ventanas diarias, tarjetas invariantes, ejes sin solapes y
ausencia de overflow/404/pageerror. Capturas revisadas en
`work/v0-adaptado-{dashboard,finanzas}-{320,375,390,768,1440}.png` y
`work/v0-adaptado-diario-320.png`. Las pruebas previas de cargas demoradas/error
siguen documentadas arriba; esta matriz no repitió los locks SQL ni mutaciones.

Los datos son de preview, no de Sofi. No se consultó ni modificó desarrollo,
no se usó la base test y no hubo operaciones reales en Cloudinary/Resend.
Comprobación adicional en navegador: bloqueo 307 sin sesión, filtros de egresos
anulados con totales invariantes, consulta del detalle real en su módulo, cierre
con Escape, período vacío y preferencia de movimiento reducido. Lint, TypeScript,
build de producción, OpenSpec strict/doctor y diff-check correctos. El build usó
también el destino preview y servicios externos desactivados; se reinició Next
después para conservar localhost:3000 disponible sin compartir artefactos de build.
Tras ese reinicio, el primer recorrido automatizado agotó la espera de navegación
del login pese a respuesta 200 de autenticación. La repetición completa pasó sin
cambios de código, datos o sesión manual. No se atribuye una causa interna no
demostrada; el acceso final quedó verificado con autenticación normal.
La aceptación visual humana y la integración siguen pendientes; localhost:3000
permanece destinado a preview. Sin commit, push ni merge.

## Resumen como centro económico — 11/11/2026

Esta decisión sustituye las descripciones anteriores de Finanzas como pantalla y
Resumen fijo al mes actual. `/admin` inicia en el mes argentino y permite anterior,
siguiente y volver al actual; «Otros períodos» conserva semana/año/rango.
RF-16 y CU-13 se contrastaron en lectura con SRS/RUP vigentes: semana, mes y año,
gráfico, cantidad/importe de vigentes y detalle en Ventas. RF-19 conserva consulta
conjunta diferenciada plegada en Resumen, filtros de anulados y acceso a historiales
paginados de Operaciones. RF-21 conserva fórmula exacta y selección de período.
Los CU adicionales de Egresos/Resultado no se inventan ni se modifican en RUP.
Inventario se identifica como actual, independiente del período económico.
Se retira Finanzas del menú lateral sin transformar el shell. `/admin/finanzas`
autoriza y redirige a `/admin` preservando solo filtros admitidos; Reportes también
redirige a Resumen. Se retiran ReportesAdmin, DesgloseSalidas y loading exclusivo
sin consumidores; servicios, contratos y pruebas financieras se conservan.
Validación acotada: 28 pruebas de cuatro archivos afectados, TypeScript, lint solo
de archivos tocados y build Webpack correctos. Navegador en preview: tarjetas y
sumas del gráfico exactas, mes anterior/actual, semana/año/rango, inventario
invariante, alias seguro, bloqueo anónimo y navegación de Operaciones, sin errores
JS. Dos capturas: work/resumen-unificado-{desktop,mobile}.png. E2E existente adaptado
sin ejecutar su suite; no se repitieron pruebas SQL ni suites generales.
Sin escrituras comerciales, servicios externos ni acceso a la base real. Preview
activa en localhost:3000; aceptación visual e integración pendientes. Sin commit.
