# Despliegue comercial de Angel Tears

Para la reunión, usá la [checklist operativa](REUNION_COMERCIAL.md) y revisá el [borrador de privacidad y atención al consumidor](PRIVACIDAD_Y_CONSUMO.md) con Sofía.

Esta guía prepara el lanzamiento con Sofía. El SHA comercial se fija al aprobar el contenido y cerrar la revisión final. Los pasos que crean cuentas, aplican migraciones o publican el sitio quedan para la reunión y requieren su autorización.

## Arquitectura y presupuesto

Precios y límites consultados el 20/11/2026. Confirmar los importes en cada checkout antes de autorizar pagos.

| Servicio | Elección inicial y condiciones |
| --- | --- |
| Railway | Hobby, desde **USD 5/mes**, incluidos como crédito de consumo. Se factura el uso sobre USD 5. Una sola persona puede operar el workspace. Sofía opera su cuenta durante la llamada. Si hace falta acceso técnico independiente y sostenido, evaluar Pro desde **USD 20/mes**. [Planes y facturación](https://docs.railway.com/pricing/plans) |
| Neon | Free, **USD 0** con 1 GB de PostgreSQL, 100 CU-h y 5 GB de transferencia pública al mes por proyecto. Suspende el cómputo si se agotan CU-h o transferencia. Las operaciones que amplían almacenamiento pueden fallar al superar el límite. La restauración instantánea del plan tiene una ventana de hasta 6 h o 1 GB de cambios. [Precios y límites de Neon](https://neon.com/pricing) |
| Cloudinary | Programmable Media Free, **USD 0**, 25 créditos mensuales compartidos por almacenamiento, transformaciones y entrega. Envía avisos y puede deshabilitar la cuenta si el exceso persiste. El sistema usa el SDK firmado y `res.cloudinary.com`, sin dominio de medios propio. [Planes](https://cloudinary.com/pricing) · [Consumo y avisos](https://cloudinary.com/documentation/billing_and_plans) |
| Resend | Free, **USD 0**, hasta 100 correos transaccionales al día y 3000 al mes. Enviar por HTTPS con un subdominio verificado. Agotar el cupo impide entregar nuevos correos hasta que se libere o se amplíe. La aplicación limita el uso de recuperación a 12 intentos diarios UTC. [Precios de Resend](https://resend.com/pricing) |
| NIC Argentina | Dominio `.com.ar`, **ARS 8.500** por alta y **ARS 8.500** por renovación anual según el arancel publicado. La delegación DNS es gratuita. Confirmar el importe en TAD y elegir un nombre disponible con Sofía. [Arancel oficial](https://nic.ar/es/dominios/dominios_y_aranceles) · [Preguntas frecuentes](https://nic.ar/es/ayuda/faq) |
| Cloudflare y monitoreo | DNS autoritativo Free, **USD 0**. UptimeRobot Free admite uso comercial con comprobaciones cada cinco minutos. [DNS de Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) · [Plan gratuito de UptimeRobot](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan) |

El piso recurrente estimado es **USD 5/mes más ARS 8.500/año**, antes de impuestos, conversión de moneda y excedentes. Arrancar con una réplica web y sin volúmenes, servicios auxiliares ni servidores de correo. Elegir regiones cercanas entre Railway y Neon, con São Paulo como primera opción si aparece en ambos paneles. Railway recomienda Pro para aplicaciones comerciales. Hobby es la opción inicial si Sofía acepta operar el workspace y el nivel de soporte del plan. [Planes de Railway](https://docs.railway.com/pricing/plans) · [Preguntas frecuentes de precios](https://docs.railway.com/pricing/faqs)

## Secuencia de instalación

1. **Sofía y el desarrollador** confirman titularidad, fotos autorizadas, precios y avisos, y eligen base nueva o copia selectiva. Fijan el SHA de lanzamiento.
2. **GitHub y Vercel.** Verificar el bundle, separar los disparadores de la demo y sincronizar solo con autorización. Seguir [el procedimiento Git](#preservar-los-commits-y-separar-la-demo).
3. **NIC Argentina y Cloudflare Free.** Registrar el `.com.ar` en TAD, crear la zona y delegar sus nameservers. Mientras se propaga la delegación, preparar Neon Free y Cloudinary Free separados de la demo. Aplicar las nueve migraciones, cargar categorías y aprovisionar la única cuenta con el correo confirmado.
4. **Resend Free.** Verificar el subdominio remitente con los registros DNS exactos del panel. **Railway Hobby.** Configurar el servicio, sus variables y la fuente Git aprobada. Agregar el dominio y sus registros DNS de destino y verificación. Esperar HTTPS antes de probar la cuenta y el correo.
5. **Aceptación.** Revisar la tienda, las fotos, los avisos, la cuenta y la recuperación. Probar un respaldo restaurado. Activar `SITE_URL` y Search Console cuando Sofía apruebe la apertura.

## Preservar los commits y separar la demo

Antes de sincronizar GitHub, crear una copia de `main` en una carpeta privada fuera del repositorio. En PowerShell, desde el repositorio, reemplazar la ruta por una carpeta existente en un disco o respaldo privado:

```powershell
$bundle = 'D:\Respaldos\angel-tears-main.bundle'
git bundle create $bundle main
git bundle verify $bundle
Get-FileHash -Algorithm SHA256 $bundle
git clone --branch main $bundle 'D:\Respaldos\angel-tears-verificacion'
git -C 'D:\Respaldos\angel-tears-verificacion' rev-parse HEAD
```

Comparar el SHA recuperado con `git rev-parse main`. Conservar el bundle y su huella en almacenamiento cifrado, con una copia en otro dispositivo. El bundle incluye el historial de `main` y sus commits locales. Los documentos de trabajo sin commit, las variables, las bases y las fotos se respaldan por separado. [Manual de git bundle](https://git-scm.com/docs/git-bundle)

En la reunión, con la persona que administra la demo de Vercel:

1. Registrar el deployment activo, su SHA y su URL. Comprobar que responde y conservar el enlace para verificarlo después.
2. En ese proyecto de Vercel, ir a **Settings → Git → Connected Git Repository → Disconnect**. Revisar deploy hooks, otras integraciones y proyectos que apunten al mismo repositorio. Dejar sin disparadores a la demo, manteniendo el proyecto y el deployment actual. Confirmar la desconexión y volver a abrir la demo. Cambiar solo la rama de producción podría dejar activos los previews de otras ramas. [Configuración Git de Vercel](https://vercel.com/docs/project-configuration/git-settings)
3. Cuando esté autorizado el push, usar `git fetch origin` y `git log --left-right --oneline origin/main...main`. Verificar que `origin/main` sea ancestro de `main` con `git merge-base --is-ancestor origin/main main`. Si hay divergencia, detenerse para revisar. Una vez verificada la separación, `git push origin main` normal y comprobación del SHA remoto y de que la demo conserva el deployment registrado.
4. Si no se puede verificar la desconexión o quedan disparadores activos, conservar el bundle y dejar pendiente el push. La demo mantiene su proyecto, dominio, Neon, Cloudinary y `noindex`; Railway usará servicios comerciales separados.

## Reunión de lanzamiento

### 1. Cuentas, dominio y fotos

- **Sofía** crea Railway, Neon, Cloudinary, Resend y Cloudflare con un correo que controla. También mantiene su acceso a NIC Argentina/TAD, Google Search Console y la cuenta de monitoreo. Activa MFA cuando esté disponible, guarda códigos de recuperación en su gestor y autoriza el pago de Railway y el dominio. Confirmar que la cuenta GitHub que autoriza Railway tiene acceso al repositorio público aprobado y limitar el alcance de la integración a ese repositorio.
- **Desarrollador** guía y prepara los nombres, comandos y DNS. Usar invitaciones nominales y permisos mínimos donde el plan lo permita. Para Railway Hobby, Sofía realiza desde su sesión los pasos que requieren acceso mientras el desarrollador la guía. Las contraseñas, los códigos y los pagos se ingresan en privado, con la pantalla compartida en pausa si corresponde.
- **Dominio.** Sofía ingresa a TAD con CUIT o CUIL y Clave Fiscal, abre NIC Argentina → Registros, Renovaciones y Otras Operaciones, registra el `.com.ar` a título propio o del negocio según corresponda y paga. En Cloudflare agrega el dominio al plan Free. En TAD lo delega a los dos nameservers que Cloudflare asigna. Si ya existen DNS o correo, conservar los registros y revisar DNSSEC antes de cambiar nameservers. Si el DNS, el certificado o el remitente siguen pendientes de verificación al final de la llamada, retomar antes de anunciar la URL. [NIC Argentina](https://nic.ar/es/ayuda/faq) · [Configurar DNS en Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
### Fotografías estáticas de Inicio

Cada foto es opcional e independiente. Si falta el hero, queda el fondo con el título y el botón de Catálogo. Si falta el interior, la sección del local conserva su información y «Cómo llegar».

1. Guardá las fotos propias autorizadas como `public/images/local/hero.webp` y `public/images/local/interior.webp`. WebP o JPEG son adecuados. Para el hero, usá un encuadre horizontal, como referencia 1920 × 1080, con el motivo lejos de los bordes y espacio para leer el título. Para el interior, preferí 4:3, por ejemplo 1280 × 960. Comprimí y retirales metadatos innecesarios antes de incorporarlas.
2. En [`app/page.tsx`](../app/page.tsx), importá cada foto disponible y agregala a `fotosInicio`. Incorporá solo el import y la propiedad de la foto que tengas. Si se reemplaza el archivo por otro con el mismo nombre, el código queda igual. Usá un texto alternativo fiel para el interior. Ejemplo con ambas fotos:

```tsx
import fotoHero from "@/public/images/local/hero.webp"
import fotoInterior from "@/public/images/local/interior.webp"

// Sustituir los valores del objeto fotosInicio existente.
const fotosInicio = {
  hero: fotoHero,
  interior: { src: fotoInterior, alt: "Interior del local de Angel Tears" },
}
```

3. Revisá Inicio y `/#el-local` alrededor de 390 px y 1440 px. El hero usa `object-cover` y cambia el recorte según el ancho y la altura: confirmá que el título y el botón sean legibles y que no se pierda el motivo principal. Confirmá el encuadre 4:3 del interior, que «Cómo llegar» funcione y que el texto alternativo describa la fotografía. Ajustá el archivo fuente si se pierde un elemento importante.

### 2. Preparar PostgreSQL limpio

#### Opción A. Base comercial nueva

Usar un clon limpio del SHA acordado, sin `.env.local`. En la raíz, verificar `node --version` = `v24.15.0`, `pnpm --version` = `11.25.0` y ejecutar `pnpm install --frozen-lockfile`. Neon debe ser un proyecto comercial nuevo, con PostgreSQL 17 como versión ensayada si está disponible. Usar la conexión directa del propietario de schema para migrar, cargar categorías y aprovisionar. Guardar las credenciales en el gestor de Sofía e inyectarlas en ese proceso por un canal privado. Antes de cada paso, confirmar proyecto, host, rama y nombre de base y la ausencia de datos o migraciones previas. El valor de `DATABASE_URL` jamás se imprime completo.

Una vez autorizado y sincronizado GitHub, reemplazar `ORG`, `REPO` y `SHA_APROBADO` por los valores del lanzamiento:

```sh
git clone https://github.com/ORG/REPO.git angel-tears
cd angel-tears
git switch --detach SHA_APROBADO
git rev-parse HEAD
pnpm install --frozen-lockfile
```

```sh
node -e 'const u=new URL(process.env.DATABASE_URL); console.log(u.hostname + u.pathname)'
pnpm db:migrate
node --conditions=react-server --import tsx -e 'const {crearConexionBd,leerUrlBd}=require("./lib/infraestructura/conexion-bd.ts"); const {sembrarCategorias}=require("./lib/modulos/productos/persistencia.ts"); const {db,pool}=crearConexionBd(leerUrlBd()); db.transaction(sembrarCategorias).finally(()=>pool.end()).catch(()=>{console.error("No se pudieron cargar las categorías");process.exitCode=1});'
pnpm auth:crear-administradora
```

El aprovisionamiento también necesita `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL`. Sofía escribe el correo confirmado, el nombre y la contraseña de forma interactiva. La contraseña se ingresa de forma oculta y se guarda en su gestor. Dejar `ADMIN_EMAIL`, `ADMIN_NOMBRE` y `ADMIN_CONTRASENA` sin definir para este procedimiento. El alta bloquea una segunda cuenta y la carga de categorías puede repetirse sin duplicados. No usar `demo:*`, los scripts de reset ni `db:generate` en producción. Confirmar 9 entradas en `drizzle.__drizzle_migrations`, 7 categorías, una fila en `configuracion_negocio` y una sola cuenta en `"user"`. Confirmar también cero productos y que la fila de Configuración es la inicial de 0007. La tabla de cuota creada por 0008 permanece vacía hasta el primer intento reservado. El catálogo arranca vacío. Con `psql`, usar `SELECT current_database(), current_user;` antes de cualquier operación.

Para el servidor, crear un rol separado desde `psql` con el rol de mantenimiento. Reemplazar `nombre_base_comercial` por el nombre confirmado:

```sql
CREATE ROLE angel_tears_app LOGIN;
\password angel_tears_app
GRANT CONNECT ON DATABASE nombre_base_comercial TO angel_tears_app;
GRANT USAGE ON SCHEMA public TO angel_tears_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO angel_tears_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO angel_tears_app;
```

`\password` pide el secreto de forma interactiva. Mantener la propiedad y el esquema `drizzle` en manos del rol de mantenimiento. Conceder permisos sobre las tablas nuevas al aplicar futuras migraciones. Usar una sola réplica con la conexión directa para esta instalación inicial. El alta de la administradora requiere conexión directa porque usa un lock asociado a la sesión.

#### Opción B. Copia selectiva de productos

Completar primero la opción A. Usar esta variante solo si Sofía autoriza una lista concreta de productos y fotos aptas para uso comercial.

1. Con acceso autorizado de solo lectura a Neon Demo, hacer un inventario privado por slug de los productos elegidos. Anotar nombre, categoría, descripción, precio a confirmar, orden de la galería y cuál es la principal. Conservar temporalmente las referencias al original de la imagen. Excluir cuentas, sesiones, cuotas, configuración, proveedores, compras, ventas, gastos, movimientos y datos ficticios. Confirmar el stock físico con Sofía.
2. Respaldar los datos seleccionados y los originales autorizados. En la instalación comercial, crear las categorías faltantes y volver a dar de alta cada producto como oculto desde el panel. Antes de crear cada uno, verificar si ya existe en el listado y llevar un registro de slugs de origen y destino. Cargar stock inicial únicamente si se contó. El alta genera su movimiento inicial sin importar historial.
3. Descargar los originales desde la cuenta de Cloudinary de la demo con acceso autorizado. Subirlos desde la galería del producto en la cuenta comercial mediante el flujo de la aplicación, respetando JPEG, PNG o WebP, hasta 3 MiB y 20 MP por archivo y hasta siete imágenes. Recuperar el orden y seleccionar la principal. El sistema escribe los nuevos `asset_id`, `public_id`, versión y `secure_url` en `producto_media` y actualiza la referencia principal del producto.
4. Verificar cada imagen, detalle, miniatura y precio en el destino. Publicar solo las fichas aprobadas. Cambiar el nombre de la cuenta en una URL vieja o pegar referencias de Cloudinary de la demo dejaría la galería dependiente del otro entorno. Conservar los originales de ambas cuentas y mantener la demo operativa.

### 3. Configurar Railway, medios y correo

Configurar Cloudinary Programmable Media Free bajo la cuenta de Sofía. Copiar el cloud name y la clave y secreto de API desde la consola del entorno comercial. La aplicación firma y sube con el SDK desde el servidor. Dejar los originales en almacenamiento privado y no crear presets sin firma. Verificar en el panel la carga y entrega de una foto propia. [Programmable Media Free](https://cloudinary.com/pricing)

En Resend, agregar `correo.<dominio>` en **Domains**, copiar en Cloudflare los registros DNS exactos de SPF, DKIM y los adicionales que indique el panel, y esperar **Verified**. Crear una clave de solo envío limitada a ese dominio cuando esté disponible. Usar un remitente del subdominio verificado, desactivar el seguimiento de aperturas y clics y comprobar la entrega al buzón confirmado de Sofía. El remitente y ese buzón cumplen funciones distintas. [Dominios verificados de Resend](https://resend.com/docs/dashboard/domains/introduction)

Crear el servicio bajo el workspace de Sofía. Cargar primero las variables en un servicio vacío. Vincular el repositorio público aprobado y seleccionar una rama cuyo último commit sea el SHA de lanzamiento. La conexión inicial puede disparar un build: autorizar el enlace solo con el SHA y las variables verificados. Desactivar los despliegues automáticos en los ajustes del servicio. Para publicar manualmente, comprobar que el HEAD remoto de la rama seleccionada coincide con el SHA autorizado y recién entonces usar **Deploy Latest Commit**. Verificar el SHA en el deployment antes de publicar el dominio. [Autodeploy de Railway](https://docs.railway.com/deployments/github-autodeploys)

Fijar Railpack con `RAILPACK_NODE_VERSION=24.15.0`, instalación `pnpm install --frozen-lockfile`, build `pnpm build` y start `pnpm start --hostname 0.0.0.0`. Confirmar en logs que Railpack tomó pnpm 11.25.0 de `package.json` y que puede descargar las fuentes de Google Fonts durante el build. Usar el `PORT` que inyecta Railway. Configurar `/robots.txt` como comprobación de arranque sin depender de Neon. Antes de abrir el sitio, verificar los datos reales en `/catalogo` y el panel, incluida la reconexión después de una pausa de Neon. Mantener desactivada la suspensión de Railway al lanzar. [Node en Railpack](https://railpack.com/languages/node/) · [Healthchecks](https://docs.railway.com/deployments/healthchecks)

#### Variables del servicio

| Variable | Cuándo se requiere y qué cargar |
| --- | --- |
| `DATABASE_URL` | **Obligatoria y secreta.** Conexión directa a Neon comercial con rol de aplicación y TLS `sslmode=verify-full`. En la terminal de mantenimiento, el mismo nombre apunta al rol propietario y queda fuera de Railway. |
| `BETTER_AUTH_SECRET` | **Obligatoria y secreta.** Generar 32 bytes aleatorios por entorno, por ejemplo con `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` en una terminal privada. Custodiarlo para restauración. |
| `BETTER_AUTH_URL` | **Obligatoria.** Origen HTTPS exacto de la tienda y el panel, sin ruta. Los enlaces de recuperación usan este origen. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | **Obligatorias para publicar y gestionar imágenes.** Valores del entorno comercial. Solo servidor. |
| `RESEND_API_KEY`, `RESEND_FROM` | **Obligatorias para recuperación.** Clave de solo envío y remitente `Angel Tears <cuenta@correo.<dominio>>` en el subdominio verificado. Sin configuración no se envía el correo. |
| `SITE_URL` | **Opcional hasta aprobar la apertura.** Origen HTTPS comercial para canonical, sitemap y enlace al producto en WhatsApp. Vacía conserva `noindex`; activarla solo en Railway comercial. |
| `BETTER_AUTH_TRUSTED_IP_HEADER` | **Opcional.** Dejar vacía hasta verificar que el ingreso sea el único acceso público y sobrescriba `X-Real-IP`. Solo entonces usar `x-real-ip`. Vacía se aplica un límite compartido por ruta. [Red pública de Railway](https://docs.railway.com/networking/public-networking/specs-and-limits) |
| `CLOUDINARY_CARPETA_ENTORNO` | **Omitir en comercial.** El código elige `produccion` automáticamente. El único valor explícito admitido corresponde a la demo. |
| `RAILPACK_NODE_VERSION`, `PORT` | **Plataforma.** Fijar `RAILPACK_NODE_VERSION=24.15.0`. Railway inyecta `PORT`; la app escucha ahí. |

Dejar fuera de Railway `ANGEL_TEARS_PREVIEW`, `DATABASE_URL_TEST`, `ADMIN_*`, `DEMO_*` y `VERCEL_*`. El aprovisionamiento de la cuenta usa los tres valores obligatorios de base y Auth en la terminal y pide los datos de Sofía interactivamente. Cargar los secretos en Variables del servicio sin `NEXT_PUBLIC_`. No incorporarlos al repositorio, capturas ni mensajes.

### 4. HTTPS, aceptación y entrega

1. Agregar el dominio custom en Railway. En Cloudflare cargar, en modo **DNS only**, el CNAME y el TXT de verificación tal como Railway los muestra. Cloudflare permite CNAME flattening en el dominio raíz. Esperar estado activo y certificado válido. Elegir un solo origen canónico y verificar redirecciones desde variantes si se publican. Mantener el dominio temporal sin difusión y retirarlo si es un alias independiente y la resolución del dominio comercial no depende de él. [DNS para dominios Railway](https://docs.railway.com/networking/domains/working-with-domains) · [CNAME flattening](https://developers.cloudflare.com/dns/cname-flattening/)
2. Sofía entra en `/admin/login` desde una ventana privada. Revisar dirección, WhatsApp, Instagram, horarios y mapa. Probar una carga firmada y publicar una primera ficha con imagen y stock. Desde **Cuenta**, cambiar la contraseña y comprobar el acceso con la nueva en otra ventana. Solicitar un solo correo autorizado al buzón confirmado, abrir el enlace en el dominio comercial, restablecer la contraseña y confirmar que la sesión anterior se revocó y el enlace ya no sirve. Probar cierre de sesión y acceso privado sin sesión. Revisar que los registros de acceso no expongan URLs con tokens.
3. Tras aprobar la apertura, configurar `SITE_URL` y verificar `robots.txt`, `sitemap.xml`, canónicos, datos estructurados y `404` de fichas ocultas. Sofía verifica la propiedad de dominio por DNS en Search Console, envía el sitemap y usa Inspección de URL para solicitar indexación de Inicio y Catálogo. La solicitud no garantiza inclusión inmediata. [Checklist de SEO](features/CIERRE_SEGURIDAD_SEO.md#activar-la-indexación-en-el-dominio-comercial)
4. Entregarle URL del panel, inventario de cuentas y permisos, calendario de renovación, guía, acceso a backups y contacto de incidentes. Sofía conserva propiedad, facturación, correo de recuperación y su contraseña del panel.

## Fallos y avisos de operación

Usar un correo de avisos que Sofía lea y que siga accesible si la tienda se cae. Acordar a quién llamar para ayuda puntual. En un aviso de caída, abrir la tienda desde datos móviles o una ventana privada para confirmar el problema. Si persiste, enviar URL, hora, pantalla, operación y mensaje visible. Evitar compartir contraseñas, códigos o enlaces de recuperación.

| Problema | Qué puede hacer Sofía | Qué se revisa con ayuda técnica |
| --- | --- | --- |
| **Railway o dominio caído** | La tienda y el panel pueden quedar inaccesibles. Abrir el sitio desde otra red y avisar si persiste. Mientras tanto, conservar aparte los comprobantes de las ventas presenciales para registrarlas cuando vuelva el panel. | Revisar estado de Railway, despliegue, DNS y certificado. Si el fallo coincide con una versión, evaluar rollback de la aplicación al último despliegue compatible. Una caída por sí sola no justifica restaurar PostgreSQL. |
| **Neon indisponible o sin cuota** | Inicio puede mostrar información parcial, Catálogo o fichas pueden mostrar un aviso de consulta y el panel puede dejar de abrir. Para una consulta, reintentar más tarde. Si un guardado quedó sin confirmar, revisar el listado al volver. Producto nuevo con stock inicial, compras, ventas, gastos y ajustes permiten reintentar desde el mismo formulario con los mismos datos. Si cerró el formulario, revisar el historial antes de recrear la operación. Para un proveedor o una anulación sin confirmar, comprobar el listado antes de repetir. | Revisar estado y consumo del proyecto, conexión TLS, credenciales y logs sanitizados. Identificar si hubo una confirmación antes de repetir escrituras. Conservar el historial y restaurar solo ante daño o pérdida confirmados. |
| **Cloudinary indisponible o cerca del límite** | Una foto pública puede mostrar «Imagen no disponible». Los textos del catálogo siguen si Neon funciona. Si la foto no se agregó, reintentar más tarde. Si el panel pide recargar datos, revisar primero la galería. Si indica que el cambio se guardó pero quedó pendiente eliminar la imagen anterior, avisar sin repetir el cambio. | Revisar Usage y Error Reports, la cuenta y la URL de la imagen. Conciliar recursos pendientes verificando sus referencias en PostgreSQL antes de eliminar archivos. |
| **Resend indisponible, sin cuota o correo rebotado** | El mensaje de recuperación es neutro. Si no llega el correo, revisar spam, esperar al menos cinco minutos y probar una vez más. Si sigue sin llegar, mantener cualquier sesión activa y pedir ayuda. El pedido por sí solo no cambia la clave. | Revisar Emails, Logs, Usage y verificación DNS en Resend, además de la cuota global y los logs de la aplicación. Si se agotaron los intentos diarios de la app, se liberan al cambiar el día UTC, sujeto a la espera entre intentos. No automatizar reenvíos. [Operación de recuperación](features/CIERRE_SEGURIDAD_SEO.md#operación-de-recuperación) |

### Alertas para configurar al desplegar

- **UptimeRobot Free.** Crear un monitor HTTPS del dominio comercial en `/robots.txt` cada cinco minutos y avisos de caída y recuperación al correo indicado. Comprobar el aviso desde la configuración del monitor. Esto mide disponibilidad web sin despertar Neon continuamente. Una revisión funcional espaciada del Catálogo detecta fallos de datos que el monitor web no detecta. [UptimeRobot Free](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan) · [Intervalos](https://uptimerobot.com/pricing/)
- **Railway Hobby.** Activar correo y avisos del panel para despliegues fallidos, procesos caídos y uso. Revisar alertas de consumo con Sofía. El healthcheck actúa al desplegar. Los monitores personalizados de métricas requieren Pro. [Notificaciones](https://railway.com/changelog/2025-11-07-notifications) · [Alertas y planes](https://railway.com/guides/alerts-crashes-failed-deploys)
- **Neon Free.** Revisar el consumo de CU-h, almacenamiento y transferencia en la consola y comprobar si la cuenta muestra avisos del plan. Usar esa revisión y los fallos de lectura de la app para diagnosticar. El aviso de presupuesto en dólares no sustituye vigilar topes Free. [Límites de Neon](https://neon.com/pricing)
- **Cloudinary Free.** Confirmar el correo que recibe avisos de cuota. En **Settings → My Profile → Email Preferences**, habilitar el resumen mensual de consumo. Revisar Usage y Error Reports ante un aviso o fotos ausentes. [Consumo y avisos](https://cloudinary.com/documentation/billing_and_plans)
- **Resend Free.** Confirmar el destinatario de avisos de cuota en la cuenta. Usar **Emails**, **Logs** y **Usage** para revisar rebotes, fallos y volumen cuando no llega el correo. Verificar durante la instalación qué avisos recibe la cuenta Free. La entrega individual se comprueba en el panel. [Cuotas y avisos](https://resend.com/changelog/pay-as-you-go-pricing) · [Diagnóstico de entrega](https://resend.com/guides/email/users-never-got-login-code)

## Backups y salida de proveedores

- **PostgreSQL.** Hacer `pg_dump` al cierre de los días con cambios y antes de migrar, con el rol de mantenimiento, endpoint directo y cliente PostgreSQL de la misma versión mayor o más reciente. Guardar la copia cifrada fuera del hosting junto con fecha, SHA y versión de PostgreSQL. Como retención inicial, conservar 7 copias diarias y 4 semanales. El historial del proveedor ayuda ante errores recientes y el dump permite recuperar fuera de Neon. [Migración con pg_dump y pg_restore](https://neon.com/docs/import/migrate-from-postgres)
- **Imágenes.** Guardar originales y un inventario privado de los archivos con producto, orden, principal, `public_id`, versión y URL. Guardar una copia local/offsite al agregar fotos. La base restaurada trae referencias, no binarios. Conservar activo el entorno de Cloudinary mientras existan referencias. Si se cambia de cuenta, volver a subir y reemplazar desde Productos con ambos servicios disponibles, y verificar cada galería antes de dar de baja la anterior.

Ejemplo con `pg_dump` y `pg_restore`. Configurar por separado los valores `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` y TLS. Usar un archivo de contraseñas protegido o el prompt de la herramienta, sin poner la contraseña en los argumentos. Para Neon usar `PGSSLMODE=verify-full` y el almacén de CA del sistema si el cliente lo admite. Cambiar y confirmar el destino **vacío y aislado** antes de restaurar:

```sh
psql -X -c 'SELECT current_database(), current_user;'
pg_dump -Fc --no-owner --no-acl -f angel-tears.dump
pg_restore --list angel-tears.dump
# Configurar las variables PG* con el destino de restauración, y volver a comprobarlo.
psql -X -c 'SELECT current_database(), current_user;'
pg_restore --exit-on-error --single-transaction --no-owner --no-acl -d nombre_del_destino_vacio angel-tears.dump
```

Comparar migraciones, categorías, configuración, cantidades de productos y movimientos y referencias a medios con el origen. Probar inicio, login autorizado, y catálogo contra la restauración antes de considerarla válida, con correo de prueba deshabilitado. Repetir el ensayo cuando cambien schema u operador de backups. [Manual de pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)

Para recuperar en otro hosting, reproducir el SHA en cualquier servidor Node compatible, restaurar en PostgreSQL limpio, configurar secretos y mantener Cloudinary y Resend mientras funcionen. Para cambio de proveedor o cancelación, congelar escrituras durante el corte, sacar un último dump más originales, verificar restauración y enlaces, actualizar DNS y variables, y comprobar el nuevo servicio antes de cancelar o revocar credenciales antiguas. Conservar el registro del dominio y el control de DNS.

## Checklist del lanzamiento

- [ ] Sofía controla las cuentas, el dominio y el método de pago. Demo desconectada y SHA comercial trazable.
- [ ] Neon comercial identificado, migraciones 0000–0008 aplicadas, categorías y configuración revisadas, única cuenta creada y respaldo restaurado.
- [ ] Build/arranque verificados en Railway con host, puerto, TLS, proxy y cabeceras correctos.
- [ ] Fotos autorizadas o versión sin fotos aprobada, catálogo real, imágenes y WhatsApp probados. Login, cambio de contraseña, cierre de sesión y recuperación comprobados.
- [ ] Avisos completos y confirmados con Sofía. HTTPS y DNS definitivos. Tras la aprobación de apertura, canónicos, robots, sitemap, datos estructurados y Search Console verificados.
- [ ] Sofía recibe accesos, documentación, renovación, límites y alertas. Se acuerda quién hará la siguiente copia y revisará el consumo.

## Ensayo local del procedimiento

El 20/11/2026 se verificó un bundle de `main` y se clonó el SHA aprobado desde esa copia. Con Node 24.15.0 y pnpm 11.25.0 se instaló el lockfile en modo congelado. En un PostgreSQL 17 temporal y vacío se aplicaron las nueve migraciones y se repitieron la carga de categorías y el alta de una cuenta de ensayo. El estado final fue de siete categorías, una configuración, una administradora, cero filas de cuota y cero productos. `pg_dump` y `pg_restore` reprodujeron ese estado en otra base vacía.

Pasó un build de producción y la comprobación HTTP local. Inicio, Catálogo y login respondieron 200. Productos sin sesión redirigió al login. El ensayo no verifica Railway/Linux, TLS de Neon, DNS, Cloudinary ni entrega real de Resend. Esos pasos se comprueban en la reunión y antes de anunciar el sitio.
