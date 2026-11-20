# Cierre técnico de seguridad y SEO

Alcance del cierre comercial: revisar los límites de autenticación, autorización e indexación sin alterar las operaciones comerciales. Referencias provisionales RF-01/02/03 y RNF de seguridad e indexabilidad según la [trazabilidad](../TRAZABILIDAD_MVP.md). CU y SRS canónicos pendientes. Aplica el diseño de [Better Auth y Resend](../adr/ADR-004-better-auth-resend.md) y el [contrato de SEO público](../../openspec/changes/implement-products-public-seo/specs/seo-publico/spec.md).

## Hallazgos y correcciones

| Severidad | Evidencia y estado |
| --- | --- |
| Alta | La app confiaba en `X-Forwarded-For` por defecto. Se requiere un origen de autenticación explícito y solo se confía en una cabecera de IP si se configura. En ausencia de cabecera verificada, Better Auth mantiene un límite compartido por ruta. |
| Media | Better Auth devolvía tokens de sesión en el JSON y habilitaba la edición de identidad por HTTP aunque Cuenta es de solo lectura. Se quitan los tokens del JSON del navegador y se bloquea `/update-user`. Se conservan la cookie firmada, el cliente existente y el enlace de recuperación. |
| Media | Ante fallos internos, el logger de Better Auth podía recibir excepciones sin redactar y las respuestas de error de la librería no pasaban por el mismo filtro que las excepciones. Se deja solo el nivel en ese logger, se redactan los HTTP 5xx y se marca toda respuesta de Auth como `no-store`. Admin y API también ganan protección básica contra framing y envío de Referer. |
| Alta · corregida | La recuperación tenía un límite por IP pero carecía de un presupuesto total de envíos. Conserva los 3 pedidos en 60 segundos de Better Auth y suma una cuota global en PostgreSQL de 12 intentos de envío por día UTC y 5 minutos entre intentos. El login conserva los 3 pedidos en 10 segundos. [Plan gratuito de Resend](https://resend.com/pricing) |
| Media | `pnpm audit` reportó `esbuild` en el servidor de desarrollo de esa herramienta, vía Drizzle Kit, y `minimatch` en el tooling de lint. No se identificó exposición por una ruta pública del runtime. No exponer servidores de desarrollo y revisar parches compatibles en mantenimiento de dependencias. [GHSA de esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99) · [GHSA de minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249) |

La revisión dirigida encontró guardias en las páginas del panel y en los servicios usados por las acciones de Productos, Inventario, Compras, Ventas, Egresos y Configuración. Las rutas de medios exigen sesión y origen al modificar. El upload valida JPEG, PNG o WebP con un máximo de 3 MiB y 20 MP. La configuración conserva el registro público desactivado, sesiones revocables con un máximo absoluto de 30 días, y recuperación de una hora y un solo uso por enlace. La reemisión mantiene el comportamiento documentado en [Desarrollo](../DESARROLLO.md#recuperación-de-contraseña-por-correo). La búsqueda dirigida de patrones de secretos no equivale a una certificación del historial.

## SEO público

- El origen indexable exige `SITE_URL` HTTPS comercial. La demo académica conocida, las vistas previas y los subdominios de Vercel/Railway indicados en el código omiten sitemap anunciado y canonical. Las páginas públicas entregan `noindex` y permiten que el rastreador lea esa instrucción. Admin y API siguen excluidos en robots y sitemap, y devuelven `X-Robots-Tag: noindex, nofollow`. Si una URL ya se conociera, bloquear su rastreo por sí solo no garantiza retirarla del índice. [Guía de noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- Inicio y Catálogo tienen títulos y descripciones propios y usan el ícono existente en sus vistas sociales. Las fichas usan el nombre, slug e imagen de cada producto. El sitemap conserva fichas publicadas agotadas. Las ocultas e inexistentes se resuelven por la misma consulta pública y `notFound()`.
- `LocalBusiness` lee contacto, dirección y horarios de Configuración. `Product` usa el precio y moneda del DTO público y traduce el saldo a disponibilidad. Ambos usan la misma política de origen que la metadata. El catálogo ya sirve dimensiones y texto alternativo de imágenes y usa tamaños responsivos para Cloudinary.

## Verificación antes de abrir al público

| Servicio | Verificación |
| --- | --- |
| Railway e ingreso HTTPS | Verificar redirección al dominio canónico, rechazo de acceso directo que pueda saltar el proxy, y sobrescritura de la cabecera de IP. `X-Real-IP` es la cabecera documentada en el ingreso público de Railway; habilitarla solo después de verificar el recorrido real. Comprobar login, logout, cookies, origen de Actions y respuestas sin caché para admin y recuperación. Excluir de los logs URLs con tokens tanto en la ruta como en la query. [Red pública de Railway](https://docs.railway.com/networking/public-networking/specs-and-limits) |
| Neon | Base separada de demo y desarrollo, conexión TLS, roles con permisos mínimos, migraciones revisadas y respaldo con restauración verificada. Alta controlada de la cuenta de Sofía con una contraseña única. |
| Cloudinary | Entorno y credenciales independientes, carga firmada, probar subida/reemplazo y entrega de la imagen pública. Confirmar el límite de cuerpo del hosting para el multipart. |
| Resend | Remitente verificado, secreto independiente, cuota de la cuenta y alertas, y prueba controlada de entrega y revocación. Confirmar que el runtime termina la tarea registrada con `after` de Next. Aplicar la migración 0008 en el entorno autorizado antes de habilitar recuperación. |
| Dominio y catálogo | Configurar `SITE_URL` y `BETTER_AUTH_URL` con el HTTPS comercial. Revisar canonical, sitemap, 404 de ocultos, imágenes sociales y JSON-LD tras configurar los datos reales. Usar una base comercial limpia; los 16 productos de revisión visual tienen manifiesto local y deben retirarse si se reutiliza esa base. |

### Activar la indexación en el dominio comercial

1. Configurar `SITE_URL` con el origen HTTPS definitivo y `BETTER_AUTH_URL` con el origen del panel. Mantener la demo y las vistas previas fuera del índice.
2. Comprobar que `/robots.txt` permite rastrear el sitio público, excluye administración y API y anuncia `/sitemap.xml`. Verificar que el sitemap y los canónicos de Inicio, Catálogo y una ficha publicada usen el dominio real. Las fichas ocultas e inexistentes deben responder 404 y quedar fuera del sitemap.
3. Validar los datos estructurados `LocalBusiness` y `Product` con el contacto, los horarios, los precios, las imágenes y la disponibilidad reales.
4. Verificar la propiedad del dominio en Google Search Console, enviar `/sitemap.xml` e inspeccionar las URLs públicas principales. [Verificar la propiedad del sitio](https://support.google.com/webmasters/answer/9008080)

## Evidencia local

Pasaron 95 pruebas unitarias focalizadas, 34 de componentes, lint, typecheck, un build y la revisión del diff. Con ese build y PostgreSQL en modo de solo lectura se verificaron dos configuraciones locales. La vista previa omitió canonical y sitemap anunciado y entregó `noindex`. El dominio simulado sirvió canonical, sitemap e imagen social. En ambas, Inicio, Catálogo y una ficha publicada respondieron 200, las fichas oculta e inexistente respondieron 404 y el panel redirigió al login con sesión ausente. Se comprobaron las cabeceras de recuperación y el acceso al ícono social.

La disponibilidad de los proveedores, la configuración del ingreso y la entrega del correo comercial se aceptan en el entorno definitivo. Las comprobaciones iniciales de seguridad y SEO conservaron la base y no requirieron correos, migraciones ni Playwright. La protección de recuperación se verificó por separado con 21 casos sobre PostgreSQL aislado y 40 pruebas unitarias focalizadas. La migración 0008 se aplicó solo a la base aislada.

## Operación de recuperación

El presupuesto admite **12 intentos por día UTC**. La espera de **5 minutos** reduce ráfagas y deja margen para reintentar si el correo demora o falla. El máximo teórico en cualquier período de 24 horas es 24, y un mes calendario UTC de 31 días admite hasta 372 intentos de esta aplicación. Ambos quedan por debajo de los 100 diarios y 3000 mensuales del plan gratuito. Esto supone que se controla por separado cualquier otro emisor que comparta la cuenta de Resend. [Plan gratuito de Resend](https://resend.com/pricing)

Better Auth resuelve el destinatario desde la cuenta administradora aprovisionada. Si el correo no existe, no se reserva cupo. La reserva se hace en PostgreSQL antes de llamar a Resend, con una sola fila compartida entre instancias. Solo cuentan los intentos autorizados, incluidos los fallos del proveedor. La espera se mide desde el último intento reservado y los pedidos rechazados no la extienden. La app no reintenta el envío automáticamente. Si falla la reserva o falta la tabla, se conserva la respuesta neutra y se omite el envío.

Si el mensaje no llega, la administradora puede usar un enlace ya recibido que siga vigente y sin usar. Si no tiene uno, puede volver a solicitarlo tras cinco minutos. Si se agotó el presupuesto, vuelve a estar disponible a partir de las 00:00 UTC, una vez cumplidos los cinco minutos desde el último intento. Si el problema persiste, el responsable del despliegue puede verificar la entrega y la cuota antes de coordinar la recuperación de acceso. Los límites de correo no invalidan sesiones existentes ni enlaces vigentes.
