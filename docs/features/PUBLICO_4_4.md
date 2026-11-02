# Cierre 4.4: entrega de imagenes, accesibilidad y rendimiento

## Fuente, objetivo y limites

Pedido expreso del responsable del 02/11/2026 sobre `main`/`origin/main` en `194d4aaa71a9e6baf53bb886b54070fff037469f`, inicialmente limpio; rama `fix/publico-4-4`. Se completa la task 4.4 de `implement-products-public-seo` y su requisito de accesibilidad/carga proporcionadas. RF-03 y RNF de acceso PC/mobile/indexabilidad son referencias suministradas; CU y trazabilidad canonica SRS/RUP siguen pendientes segun [trazabilidad](../TRAZABILIDAD_MVP.md). No se inventan requisitos ni criterios comerciales.

Se conservan Producto, galeria de siete, publicacion, disponibilidad, principal y referencias persistidas. Sin cambios en Auth, Inventario, consultas/contratos de dominio, schema/migrations, dependencias ni fixtures. Video y 5.x siguen pendientes. No es un deployment ni una certificacion de Core Web Vitals de campo.

## Problema comprobado y solucion

La configuracion global `unoptimized: true` anulaba el delivery responsive efectivo. Cards, principal y thumbnails descargaban originales; una PDP con siete imagenes transferia aproximadamente 11,6 MB en la medicion. No faltaba otro almacenamiento ni un nuevo uploader.

`lib/imagen-delivery.ts` deriva URLs desde referencias originales versionadas, sin reescribir PostgreSQL ni assets. Solo transforma HTTPS con host exacto `res.cloudinary.com`, ruta `image/upload/v<version>/...`, segmentos acotados y formato JPEG/PNG/WebP. Rechaza credenciales, puerto, query/hash y rutas `fetch`/transformaciones inyectadas. Anchos cerrados de 64 a 1920 px; `c_limit,w_N/q_auto/f_auto` limita sin ampliar el original, ajusta calidad y negocia formato. El browser de la medicion recibio imagenes `image/jxl` decodificables; no se promete siempre WebP/AVIF. No hay SDK, API key ni secret en este helper cliente.

`ImagenProducto` usa `next/image` con ese loader/srcset y un fallback textual accesible por referencia fallida. La caja mantiene sus dimensiones; una nueva referencia puede recuperarse. No se oculta el error volviendo silenciosamente al original. Referencias HTTPS historicas de otros hosts se conservan como imagen directa sin optimizacion; no se aceptan como fuente de un fetch/proxy de servidor. Los endpoints de upload conservan sus validaciones existentes del proveedor. La optimizacion no agrega un importador de URLs ni asegura que una imagen CDN ya compartida deje de ser publica al ocultar Producto.

Se retira `unoptimized` global: imagenes locales pasan por el optimizador Next; Producto Cloudinary va directamente al CDN, sin doble optimizacion. `remotePatterns: []` impide utilizar `/_next/image` para pedir URLs remotas arbitrarias (E2E comprueba 400). OG/JSON-LD conservan las referencias HTTPS originales validas y metadata existente.

Fundamento tecnico: [optimizacion oficial de Cloudinary](https://cloudinary.com/documentation/image_optimization) y [modos de resize](https://cloudinary.com/documentation/image_resize_modes), consultados el 02/11/2026; configuracion y comportamiento de Next comprobados contra la version instalada 16.0.10. No se agregan dependencias.

## Sizes, prioridad, lazy y layout

| Superficie | Decision |
| --- | --- |
| Home hero | Local, `sizes=100vw`, priority por ser candidata LCP; decorativa con alt vacio. |
| Home productos | Cuatro columnas desktop (maximo 286 px), dos tablet, una mobile; lazy. |
| Catalogo/relacionados | Tres columnas desktop (maximo 411 px), dos tablet, una mobile; priority solo primera card del catalogo inicial, relacionados lazy. |
| PDP | Principal con caja cuadrada reservada, maximo 600 px desktop y ancho disponible mobile; priority solamente imagen inicial. |
| Thumbnails PDP | 64 px, lazy, srcset pequeno; cambiar seleccion no precarga las siete completas. |
| Admin listado/editor/galeria | Sizes 80/320/256 px segun caja; imagenes persistidas con el mismo loader. |
| Acceso admin | Foto/layout 44/56 y encuadre conservados. Precarga condicionada a desktop >=1024 px; mobile no descarga la imagen oculta. |

Las proporciones y cajas ya existentes se mantienen; no hay rediseno. Los errores remotos no colapsan la principal. No se modifican previews locales del uploader, progreso ni reglas de reemplazo/compensacion.

## Responsive, accesibilidad y fuentes

E2E recorre Home/catalogo/PDP y Productos admin con siete imagenes a 320, 390, 768, 1280 y 1440 px. Verifica ausencia de overflow horizontal, alt, targets del menu, Enter/Escape y retorno de foco, seleccion de thumbnail con teclado, srcset/lazy, foco de reemplazo y fallback con caja estable. Login mobile no pide la foto; al ampliar a desktop la descarga y decodifica. Capturas de PDP/admin de los cinco anchos en `test-results/publico-4-4-*`, ademas de las de produccion local indicadas abajo.

Correcciones minimas: menu/contactos con targets de 44 px, Escape devuelve foco al disparador; texto de WhatsApp pasa de contraste 3,55 a suficiente sobre el verde existente; token de error claro pasa de `#A65D57` (4,426 sobre crema) a `#914A45`. Tipografia/identidad preservadas. Movimiento reducido desactiva desplazamiento suave y reduce transiciones/animaciones sin esconder contenido ni feedback.

axe-core 4.14.0, ya disponible transitivamente, se ejecuta despues de medir para no contaminar el perfil. WCAG 2 A/AA y 2.1 AA: antes una violacion de contraste en Home y otra en galeria admin, despues cero violaciones automaticas en Home/catalogo/PDP/login/listado/galeria medidos. La revision manual de un aviso incompleto de ARIA detecto el contenedor de thumbnails con aria-label sin rol; se corrige con role=group. Los casos incompletos restantes sobre fotos/transparencias requieren contexto visual; no se afirma certificacion WCAG ni auditoria de todo el monolito. Revision de headings, labels, foco, nombres de thumbnails/estados y fotos decorativas incluida en los recorridos del slice.

DM Sans y Playfair Display mantienen `next/font`, alojamiento local, subset latin y `font-display: swap`; se verificaron fuentes cargadas, 76040 bytes transferidos y ausencia de CLS atribuible a su carga en las paginas publicas medidas. No se cambia identidad tipografica. Lecturas/paginas conservan RSC y las tarjetas su composicion existente: las incluidas en el filtro cliente tambien forman parte de ese bundle. El fallback de imagen es cliente; filtro, menu y selector conservan su interaccion necesaria. No se envia SDK Cloudinary ni se hace una reescritura de arquitectura.

## Metodo y evidencia de produccion local

Baseline compilada desde `194d4aa` y version optimizada con `pnpm build`/`pnpm start`, no `pnpm dev`. Chromium/Playwright, browser context frio y cache del browser deshabilitada, dos corridas por pagina publica. Mobile 390x844, DPR2, CPU 4x, latencia 150 ms, bajada 200000 bytes/s y subida 93750 bytes/s; desktop admin 1366x900 sin throttling. Cache CDN del proveedor y cache del optimizador local pueden estar calientes: no se equipara con usuarios/productivo y no son percentiles estadisticos.

Muestra exclusiva descartable: un Producto publicado/destacado con siete assets reales Cloudinary, usando imagenes existentes, sin convertir los fixtures en dataset ni modificar productos comerciales. Misma muestra en ambos perfiles; la interaccion PDP selecciona imagen 2 y se incluye en los bytes. CDP contabiliza bytes de red reales incluso cross-origin; PerformanceObserver registra LCP, CLS por ventana de sesion y Event Timing con interactionId. Se espera fuentes y dos frames antes de capturar. No se usan porcentajes o tiempos simulados.

Resultados finales (rangos observados de dos corridas, no percentiles; KB/MB decimales). Los bytes incluyen imagenes descargadas durante el recorrido, no necesariamente todas las imagenes del documento:

| Pagina/perfil | LCP antes -> despues (ms) | Imagenes antes -> despues | CLS antes/despues |
| --- | --- | --- | --- |
| Home mobile | 936-1080 -> 1048-1116 | 5,57 MB -> 107 KB | 0 / 0 |
| Catalogo mobile | 10044-10052 -> 1296-1320 | 1,64 MB -> 28,8 KB | 0 / 0 |
| PDP siete imagenes mobile | 57492-57592 -> 1308-1324 | 11,60 MB -> 46,8 KB | 0 / 0 |
| Login desktop | 104 -> 144 | 605 KB -> 111 KB | 0 / 0 |
| Listado admin desktop | 96 -> 104 | 4,15 MB -> 5,4 KB | 0 / 0 |
| Galeria admin desktop | 648 -> 372 | 11,60 MB -> 45,3 KB | 0,0668 / 0,0668 |

Home no presenta mejora LCP en estas muestras: ya rondaba un segundo y el elemento LCP puede ser texto; aun asi la transferencia de imagenes cae aproximadamente 98%. Login/listado tienen pequenas variaciones de latencia local; no se ocultan ni se atribuyen causalmente a dos muestras. Catalogo/PDP eliminan el cuello de botella de originales completos. La galeria admin conserva CLS 0,0668 de su contenido asincrono existente, inferior a 0,1; no se afirma CLS cero en todo admin.

Event Timing final: Home 24 ms en una corrida (la otra sin entrada sobre umbral); filtro de catalogo 16-24 ms; cambio de thumbnail PDP 24-32 ms. No es INP de campo. JS transferido Home 157060 -> 157635 bytes, catalogo 163468 -> 164133, PDP 166372 -> 167050: aumento compartido menor a 700 bytes por pagina por el delivery/fallback, sin SDK ni libreria nueva. Fuentes 76040 bytes en ambos perfiles. Cero fallbacks y cero respuestas HTTP de error de imagen en las nueve mediciones finales, con imagenes decodificadas.

Datos resumidos versionados en [evidencia/publico-4-4.json](evidencia/publico-4-4.json). Evidencia local ampliada: `work/perf44-antes.json`, `work/perf44-despues.json`, `work/perf44-capturas/`, scripts `work/perf44-medir.ts` y `work/perf44-fixture.ts`. JSON/capturas ampliados son locales ignorados por Git; no contienen credenciales. No se versionan URLs Cloudinary completas, contrasenas ni valores de entorno.

Cleanup real: producto descartable y siete assets retirados, sin referencias vigentes a esos recursos. La comparacion literal con el hash inicial detecto una edicion concurrente ajena a estos scripts: el Producto `anillo`, ya existente al inicio, recibio imagen/version 2 a las 06:14:48 UTC, despues de tomar el baseline a las 06:12:40. Se conserva esa edicion. Reconstruir **solo en memoria** su estado anterior (sin imagen/version 1) y excluir su nuevo medio reproduce exactamente el hash inicial de las tres tablas completas; las demas filas coinciden. No se revirtio ni escribio ese producto para hacer pasar el chequeo. Ledger local registra cleanup y esta excepcion comprobada; no se afirma igualdad literal de todo el conjunto despues de una edicion concurrente.

## Aceptacion, pruebas y riesgos residuales

- [x] CDN responsive real, originales/referencias conservados, Next sin doble optimizacion.
- [x] Sizes, dimensiones, lazy/prioridad proporcionados, errores con caja estable.
- [x] Responsive/teclado/foco/alt/contraste y movimiento reducido verificados.
- [x] Medicion antes/despues sobre build de produccion con Cloudinary real; JS/fuentes revisados.

359 unit/component (50 archivos), 172 PostgreSQL (17 archivos), 60 E2E completos y repeticion de los tres E2E afectados tras el ultimo ajuste semantico, todos correctos. Nuevas pruebas: derivacion de URLs/limites/entradas inseguras, fallback/recuperacion por referencia y tres recorridos responsive/teclado/delivery/error. Una espera de la prueba existente de cola ahora aguarda a que el boton este habilitado antes de pulsarlo; no se retiran aserciones ni se debilita la cola.

Lint sin advertencias, typecheck, build de produccion (tambien reconstruida por los E2E), db:check y db:generate sin cambios (12 tablas), OpenSpec strict/doctor y diff-check. Las comprobaciones SQL son regresion adicional: no cambia la integracion/persistencia. La primera corrida E2E sufrio una salida nativa del worker Windows 3221226505 y dejo un fixture en `_test`; no se conto como verde. Se retiro exclusivamente ese fixture identificado mediante guard de base aislada y se repitio la suite completa sin exclusiones: 60/60. Advertencias de herramientas: tabla baseline-browser-mapping antigua y NO_COLOR/FORCE_COLOR del runner, sin cambiar dependencias para silenciarlas.

Lighthouse no esta disponible en CLI ni dependencias del proyecto; no se instala otra herramienta ni se inventa score. Event Timing aporta muestras de latencia de interacciones controladas, **no INP de campo**; ausencia de entrada bajo su umbral de 16 ms no significa cero. LCP/CLS de campo y percentil 75 de INP requieren deployment/trafico, y se deben contrastar despues mediante RUM/CrUX si existe volumen suficiente. Hosting, cold start, red real, cuotas/CDN y contenido final siguen siendo variables de aceptacion productiva. `SITE_URL` final queda para deployment, sin inventar dominio.

La task 4.4 pide verificar/corregir el slice y registrar medicion; ese alcance tecnico se cierra con evidencia local real. No se declara aprobada la aceptacion productiva, ni se archiva el change ni se marcan 5.x por este cierre. Conservacion de precios historicos en Compras/Ventas e integracion completa con owners mantienen sus pendientes anteriores.
