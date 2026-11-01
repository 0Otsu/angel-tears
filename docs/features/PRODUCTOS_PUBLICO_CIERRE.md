# Producto/publico/SEO independientes de Cloudinary

## RF y CU relacionados

RF-03..07 de referencia suministrada; decisiones A/C/L y destacado de la actualización 8, [blueprint](../BLUEPRINT_IMPLEMENTACION_MVP.md), ADR-003/007/008 y change `implement-products-public-seo`. CU exactos pendientes de formalización con RUP; no se crean identificadores ni se certifica aceptación académica.

## Objetivo y contexto

31/10/2026. Por solicitud expresa se trabaja secuencialmente desde main/origin `86cf98d`, rama independiente `feature/productos-publico-cierre`. `feature/productos-2-2-imagen` se conserva sin cambios en `dde6b2b`: primera imagen implementada, smoke real Cloudinary bloqueado por las tres credenciales ausentes. No se incorpora ninguno de sus commits. La confirmación humana de 1.1 permanece registrada en aquella rama; su integración documental no se adelanta aquí.

## Producto 2.4

`publicacion.ts` implementa publicar/ocultar/destacar/quitar destacado. Cada comando usa `conAdministradora`, Zod (UUID, versión positiva y acción allowlist) y una transacción con lock de Producto. Solo escribe el flag correspondiente, versión y fecha; una versión obsoleta se rechaza. Ocultar/destacar no exige imagen ni saldo; publicar exige referencia persistida completa y URL HTTPS utilizable. El constraint de P0 ya exige conjunto completo; no se consulta ni simula Cloudinary. La validación del archivo/proveedor pertenece a 2.2.

`publicacion-acciones.ts` compone el guard real, conserva protección de origen nativa de Actions, devuelve errores técnicos neutros e invalida paths únicamente después del commit. No añade UI anticipada de 2.5 ni permite borrar productos. Los cambios no tocan Auth, Inventario, contratos compartidos, schema o migraciones.

Aceptación: ausencia de sesión sin lecturas/escrituras; imagen requerida al publicar; oculto sin imagen permitido; cuatro acciones conservan datos/slug/precio/imagen/saldo; inexistente/versionado inválido/conflicto distinguidos; carreras no sobrescriben. Pruebas específicas: `publicacion.integracion.test.ts`, PostgreSQL aislado del arnés existente, referencias de imagen insertadas solo en test sin red/proveedor falso de runtime.

## Fuera de alcance y dependencias

2.2 no cerrada, 2.3 sin implementar. 2.5 solo planificación hasta integrar imagen/reemplazo. Sin carga demo, borrado de fixtures, nuevas tablas, nuevas dependencias ni infraestructura. Dominio productivo, catálogo comercial y credenciales reales siguen siendo requisitos operativos pendientes; no se inventan valores.

## Checkpoints

Los resultados se registran por task al terminar su validación. Ningún check anterior representa el smoke Cloudinary. No merge ni push por instrucción de esta entrega.

### Bloqueo local de validación — 31/10/2026 (histórico, resuelto)

2.4 queda **parcial**, sin marcar completa: implementación y siete escenarios PostgreSQL preparados, sin ejecución satisfactoria. El arnés falla al conectar a `127.0.0.1:62075` (ECONNREFUSED). Docker Desktop no estaba iniciado; tras iniciarlo y reiniciarlo una vez, aborta por `initializing Inference manager` / socket `Docker/run/dockerInference` inaccesible. No se cambian opciones del motor ni se borran contenedores/volúmenes/datos para resolverlo. El fallo coincide con [el incidente reportado en Docker](https://github.com/docker/desktop-feedback/issues/554), sin asumir que la reparación de otra máquina sea aplicable a esta.

Los tipos ignorados `.next/dev/types` de 2.2 apuntaban a su Handler ausente en main; se apartaron reversiblemente a `work/tipos-next-22-20261031`, sin tocar código/configuración. `pnpm typecheck` pasó después. Lint, build, `db:check`, `db:generate` (11 tablas, sin cambios), OpenSpec strict (3/3), doctor saludable y diff-check correctos. `pnpm test`: **240 pruebas / 32 archivos**, incluidas tres nuevas de frontera (sin sesión, fallo técnico del verificador, entrada inválida sin transacción). No son evidencia SQL: las siete pruebas de integración de 2.4 siguen pendientes de ejecución. El build todavía genera el público de fixtures porque no se implementó 3.x.

La instrucción de trabajar secuencialmente exige probar/confirmar cada checkpoint antes del siguiente. Por ello no se inicia 3.1, y 3.2–3.4/4.1–4.4 permanecen sin implementar en esta rama. E2E de público real no aplica todavía; los E2E con DB tampoco pueden validarse hasta recuperar el servicio. No se elimina ni migra ninguno de los siete fixtures. No hay relacionado real ni seed nuevo.

Para retomar: recuperar Docker Desktop sin reset de datos, iniciar el contenedor existente `angel-tears-local-pg17`, ejecutar integración de `publicacion.integracion.test.ts` y regresión Producto/Inventario, verificar guard real con sesión y cerrar 2.4 solo si pasan. Después seguir 3.1 → 3.2 → 3.3 → 3.4 → SEO 4.x. 2.5 queda para listado con CTA Nuevo producto, alta dedicada, edición, categoría/filtro y menú accesible; integrar sus acciones de imagen únicamente después de 2.2/2.3.

Integración futura de 2.2: no hay dependencia de sus archivos ni cambios de package/lock, contratos o schema. Ambas ramas editan `tasks.md`; conciliar las notas y conservar su cierre humano de 1.1 y estado real de 2.2. Sus cambios de UI/DTO de imagen no se copian en esta rama. Tras combinar, repetir checks de edición/versionado y público; la referencia publicada deberá provenir del upload real validado en 2.2.

### Cierre de 2.4 — 31/10/2026

Docker ya operativo por intervención del responsable. Se inició únicamente `angel-tears-local-pg17`, conservando volumen y datos. Conexión PostgreSQL real confirmada y hashes de las tres migraciones de desarrollo coinciden con `0000_auth-base`, `0001_catalogo-proveedores-base`, `0002_inventario-base`; no hizo falta aplicar ni generar migraciones. **7/7** escenarios de publicación pasan; regresión conjunta **52/52** Producto/Inventario, incluida la prueba existente con verificador Better Auth real. Las tres pruebas unitarias de frontera comprueban ausencia de acceso ante sesión inexistente/fallo del verificador/entrada inválida. Typecheck, lint específico, OpenSpec strict y diff-check correctos. Se cierra 2.4 al nivel de comandos/Action autorizado, sin adelantar UI de 2.5 ni afirmar upload real.

### Cierre de 3.1 — 31/10/2026

Consultas de Catálogo con DTO público explícito: precio decimal string/ARS, categoría, opcionales existentes, imagen HTTPS/dimensiones/alt y disponibilidad booleana. Sin saldo exacto, mínimo, versión, actor o identificadores del proveedor. JOIN explícito de solo lectura autorizado en blueprint sección 6; nunca escrituras a Inventario ni cambios en su código/contratos. Una sola consulta para filtrar publicado+stock>0, categoría, destacados, exclusión y límite, orden estable por UUID sin ranking. PDP solo exige publicado; agotado devuelve disponible=false, oculto/inexistente null. Fallos técnicos se propagan. Cinco pruebas PostgreSQL, lint específico, typecheck, OpenSpec strict y diff-check correctos. Sin dependencia de código/credenciales de 2.2.

### Cierre de 3.2 — 31/10/2026

Catálogo y PDP RSC consumen la proyección real, sin SSG de los siete fixtures, que se conservan intactos. Filtro de las siete categorías aprobadas; vacío de catálogo y vacío de filtro distintos. Precio formateado con BigInt/string, sin redondear centavos grandes. Imagen persistida con alt real, estado disponible/Sin stock y opcionales solo cuando existen. Se conserva composición/estilos y contactos/entrega confirmados; se retiran textos de muestra y cuidados/materiales no propios del registro. Relacionados usan la misma consulta con categoría/exclusión/límite tres. Sin tabla ni configuración adicional.

Metadata básica y PDP comparten `cache` de React solo por solicitud. Catálogo/PDP `force-dynamic`, sin caché persistente; links de producto sin prefetch para no anticipar una ficha que luego se oculte. Errores SQL se redactan antes de llegar al boundary; reintento hace recarga real (reset de un error RSC sin petición nueva no recuperaba el dato). Oculto/inexistente responde HTTP 404; un fallo técnico no se transforma en null/lista vacía. La política integral de Home/stock se completa en 3.4.

Evidencia: cinco E2E con servidor Next de producción/base `_test` (tres viewports, HTML sin JS y error SQL/recuperación). La imagen HTTPS del dataset de pruebas se responde con un asset local solo en el navegador de prueba, sin proveedor remoto. El error SQL renombra temporalmente la tabla de la base aislada y siempre restaura en finally; no toca desarrollo/migraciones. Un test unitario comprueba precio exacto; cinco PostgreSQL de proyección se conservan verdes. Lint/typecheck/build/OpenSpec/diff correctos. Capturas desktop y mobile inspeccionadas, sin desborde horizontal; no equivalen a aceptación Cloudinary.

### Cierre de 3.3 — 31/10/2026

Home dinámica sustituye su selección de muestra por hasta cuatro destacados publicados/con stock (tamaño visual existente), orden UUID estable sin ranking. Categorías del filtro derivadas de esos productos elegibles. Vacío explícito; error recuperable acotado a selección, con formulario GET nativo para nueva solicitud sin ocultar contactos/contenido del negocio. Hero/local/historias/contacto/footer conservados. E2E específico verde verifica elegible, agotado/oculto/no destacado excluidos, dirección y WhatsApp. Lint/typecheck/build/OpenSpec/diff correctos. No se borran fixtures ni se crean productos comerciales/seed.

### Cierre de 3.4 — 31/10/2026

Política ADR-008: Home/catálogo/PDP `force-dynamic`, lectura SQL por solicitud, sin cache persistente compartida. `cache` de React solo comparte PDP y metadata dentro de la misma solicitud. No `unstable_cache`, tags stale, caché de saldo en Producto, Redis o flags experimentales. Enlaces de ficha y regreso al catálogo sin prefetch. Actions de alta/edición/publicación invalidan Home/catálogo/PDP/sitemap y admin únicamente tras resultado ok/commit; las consultas nuevas de stock no requieren modificar hooks/código de Inventario.

E2E específico verde: header no-store; ocultar tras visitar PDP y regresar por navegación cliente retira la tarjeta, URL directa 404 y Home sin el producto; republicar recupera listado; saldo cero retira Home/listado pero conserva PDP Sin stock; reponer devuelve ambos. Cambios del dataset solo en `_test`, restaurados en finally. Lint/typecheck/build correctos. No se promete push a pestañas abiertas ni eliminar cachés ajenas/copias CDN de imágenes: una nueva navegación/recarga obtiene datos vigentes. El caso integral desde UI de ajustes/imagen/publicación corresponde a 5.1, no se marca por esta prueba de frescura.

### Cierre tecnico de 4.1 — 31/10/2026

Metadata individual (title/description/canonical/OG/Twitter) usa la misma lectura por solicitud que PDP y su imagen HTTPS persistida, incluso agotado. Home/catalogo tienen metadata propia; no se hereda canonical publico en admin. Configuracion nueva `SITE_URL` solo servidor, documentada vacia en `.env.example`, sin alterar `.env.local`. Acepta origen HTTPS sin ruta/query/credenciales/puerto, rechaza IP/localhost/hosts locales y nunca usa Host/forwarded/Better Auth como base. No hace DNS ni verifica propiedad del dominio: eso sigue siendo operativo. Ausente: sin canonical/OG URL y noindex, nunca localhost implicito. Dominio final pendiente de confirmacion/configuracion del responsable; se cierra implementacion parametrizada, no aceptacion productiva/indexacion externa.

Doce pruebas de configuracion/metadata y E2E de HTML real (dominio reservado `https://tienda.example` solo en el proceso de prueba) verdes; HTML util sin JS ya verificado en 3.2. Lint/typecheck/build/OpenSpec/diff correctos. Referencia tecnica: [metadata de Next](https://nextjs.org/docs/app/api-reference/functions/generate-metadata); se mantienen version y convenciones actuales, sin dependencia nueva.

### Cierre tecnico de 4.2 — 31/10/2026

Product/Offer comparte el DTO de PDP: precio decimal exacto, ARS, categoria/imagen HTTPS y disponibilidad InStock/OutOfStock; material/color/descripcion solo si existen. No inventa marca/estado/reviews/SKU. LocalBusiness usa nombre, direccion y referencia, ciudad/provincia, telefono e Instagram ya confirmados, sin horarios/dias/coordenadas. URLs solo con SITE_URL configurada. JSON-LD en HTML con escape de `<`, `>`, `&`, U+2028/U+2029; texto hostil no puede cerrar script. Tres unitarias y E2E con texto hostil persistido/restaurado en test, disponibilidad agotada y LocalBusiness verdes. Lint/typecheck/build/OpenSpec/diff correctos. Trazabilidad actualizada puntualmente; rich results e indexacion productivos no se declaran. Fuente tecnica: [JSON-LD en Next](https://nextjs.org/docs/app/guides/json-ld) y [Offer](https://schema.org/Offer).

### Cierre tecnico de 4.3 — 31/10/2026

Sitemap y robots como convenciones nativas Next, ambos force-dynamic. Sitemap Home/catalogo/PDP publicadas, incluidas agotadas; no ocultos/admin/API/recovery/reset. Ultima modificacion de PDP: mayor fecha real entre Producto y saldo de Inventario, sin fecha artificial en paginas estaticas. Una sola consulta indexable de solo lectura, sin modificar Inventario. Sin SITE_URL, sitemap vacio y robots disallow-all; al configurarlo se habilitan URLs canonicas/indexables del origen confirmado. Robots no autoriza: el guard/noindex administrativo existente sigue intacto.

Seis pruebas PostgreSQL de proyeccion (incluye nueva evidencia indexable/lastModified) y E2E sitemap/robots verdes: agotado incluido, oculto fuera, ocultacion retira URL en solicitud siguiente, admin sin sesion redirige al login. Lint/typecheck/build/OpenSpec/diff correctos. Un build encontro un fallo transitorio del cache generado de fuentes/Turbopack; se aparto reversiblemente `.next` a `work/next-seo-cache-20261031` y recompilo correctamente, sin cambiar fuentes/configuracion/dependencias. Referencia: [sitemap de Next](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap). Dominio/HTTPS y verificacion externa siguen pendientes de operacion.

### Checkpoint parcial de 4.4 — 31/10/2026

Se verificaron desktop 1440, notebook 1280, mobile 390 y stress a 320 px. La prueba con nombre/descripcion sin espacios y precio maximo permitido encontro overflow real: corregido con min-width/overflow-wrap y wrap del precio, sin cambiar layout/tamanos generales. Filtro de categoria y acordeon funcionan con teclado y conservan foco visible; estados de filtro anunciados, botones con nombre/pressed y todas las imagenes con alt. Imagen principal PDP con prioridad de carga, tarjetas/relacionados lazy y cajas aspect-ratio; no se modifica imagenes de identidad ni contactos. Capturas desktop/mobile inspeccionadas; no se afirma auditoria WCAG integral.

Medicion local Chromium/Next produccion sobre dataset aislado, sin throttling, JS caliente tras catalogo→PDP e imagen de prueba interceptada: TTFB 14,1 ms; LCP observado 92 ms; CLS 0; diez recursos JS, 154.248 bytes codificados. Contraste de secundario/crema 5,24:1 y CTA/crema 6,62:1. Archivo operativo ignorado `work/publico-metricas-20261031.json`; E2E guarda el JSON de cada corrida. Estos numeros son diagnostico local, no CWV del hosting/CDN ni promesas de rendimiento real.

**4.4 no se marca completa**: `next.config.mjs` conserva unoptimized=true; aunque sizes/espacios/lazy existen, no hay srcset optimizado efectivo del proveedor. Assets visuales originales existentes pesan alrededor de 1,5–1,8 MB; no se los borra ni convierte en datos comerciales. La entrega responsive por CDN acordada en ADR-007, medidas con imagenes remotas reales y condiciones de hosting quedan para el cierre de imagenes. Se respeta el NO tocar Cloudinary/2.2/configuracion de esa rama y no se introduce otro pipeline ni una decision arquitectonica para sortearlo.

### Estado al terminar este avance

2.4 completa; 3.1–3.4 completas; 4.1–4.3 implementadas/verificadas tecnicamente con SITE_URL parametrizada. 4.4 parcial segun el limite anterior. Sin dominio definitivo configurado: URLs SEO omitidas, sitemap vacio y noindex/disallow-all; configurar origen HTTPS real antes de produccion, sin aceptar localhost, tampoco con punto DNS final. 2.2 permanece intacta/bloqueada por smoke real, 2.3 no iniciada y 2.5 solo plan. 5.1 integral con imagen/ajustes/UI, 5.2 cierre global y 5.3 integracion/aceptacion siguen abiertos.

Los siete fixtures siguen intactos como base del dataset demo futuro; catalogo, PDP, relacionados y seleccion Home ya no los usan como fuente comercial. No seed ni productos de muestra en desarrollo/produccion. No cambios a Auth, Inventario, contratos compartidos, schema, migrations, package o lock. La consulta JOIN es solo lectura propia del catalogo autorizada en blueprint. Al integrar 2.2 despues: conciliar notas/checkboxes de tasks.md (preservar su cierre humano de 1.1 y evidencia Cloudinary real), y adiciones de .env.example (SITE_URL + variables del proveedor, sin valores reales). El resto del codigo de imagen/DTO de 2.2 no se copio; repetir checks combinados de versionado/refresco/UI.

### Checks finales de esta rama — 31/10/2026

- `pnpm test`: 258 pruebas / 35 archivos, incluidas fronteras de publicacion, formato monetario, origen/metadata y JSON-LD.
- `pnpm test:integration`: 136 pruebas / 13 archivos, PostgreSQL real; siete originales de 2.4 y regresiones Producto/Inventario/Auth/proyeccion.
- Playwright publico + Producto 2.1: 15/15 contra Next de produccion; dominio reservado solo para prueba. Dos E2E adicionales sin SITE_URL comprueban ausencia de canonical local y sitemap vacio/robots restrictivo.
- Lint y typecheck verdes. Build real repetido por el arnes E2E (tambien sin dominio), correcto. Aviso preexistente baseline-browser-mapping conservado, sin actualizacion oportunista.
- db:check correcto; db:generate: 11 tablas, sin cambios ni migrations nuevas. OpenSpec strict: 3/3; doctor saludable; diff-check correcto.
- La regresion completa detecto la expectativa vieja de refrescar solo admin en el test de Actions: actualizada para todas las rutas publicas, conservando los casos de rechazo/fallo sin revalidacion. Revision final agrego rechazo de aliases localhost con punto DNS terminal.
- Fetch final: main/origin siguen en 86cf98d. Rama de imagen sigue exactamente dde6b2b, sin merge/push. Datos de desarrollo y fixtures intactos; PostgreSQL queda en ejecucion con su volumen existente.

Commits de checkpoints: 12bbafb (cierre SQL 2.4), f6eaca3 (3.1), eb31243 (3.2/relacionados), 5ff15f0 (3.3), e21b623 (3.4), 7a89f92 (4.1), 1410e4c (4.2), 99286c2 (4.3), 69090a3 (regresion de refresco), 259df9e (origen localhost). El checkpoint final de 4.4 agrupa unicamente pruebas/auditoria y correccion de overflow; conserva el checkbox sin marcar.

Resta: credenciales/smoke real y cierre/integracion de 2.2; 2.3 reemplazo/compensacion; 2.5 UI administrativa final; entrega optimizada de imagenes/CWV reales de 4.4; dominio/hosting/contenido/dataset demo explicito y pruebas integrales/aceptacion 5.x. La regresion de precios historicos de 2.1 continua pendiente hasta contar con Compras/Ventas persistidas; no se inventa infraestructura para certificarla. No se mergea/pushea hasta revision expresa del responsable.
