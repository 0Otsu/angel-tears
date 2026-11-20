# Despliegue comercial de Angel Tears

Base aprobada `487ffafd7f0b34c330647cc7dd8b7b0b99bcc523`. Esta guía prepara el lanzamiento con Sofía. Los pasos que crean cuentas, aplican migraciones o publican el sitio quedan para la reunión y requieren su autorización.

## Arquitectura y presupuesto

Precios y límites consultados el 20/11/2026. Confirmar los importes en cada checkout antes de autorizar pagos.

| Servicio | Elección inicial y condiciones |
| --- | --- |
| Railway | Hobby, desde **USD 5/mes**, incluidos como crédito de consumo. Se factura el uso sobre USD 5. Una sola persona puede operar el workspace. Sofía opera su cuenta durante la llamada. Si hace falta acceso técnico independiente y sostenido, evaluar Pro desde **USD 20/mes**. [Planes y facturación](https://docs.railway.com/pricing/plans) |
| Neon | Free, **USD 0** con 1 GB de PostgreSQL, 100 CU-h y 5 GB de transferencia pública al mes por proyecto. Suspende el cómputo si se agotan CU-h o transferencia. Las operaciones que amplían almacenamiento pueden fallar al superar el límite. La restauración instantánea del plan tiene una ventana de hasta 6 h o 1 GB de cambios. [Precios y límites de Neon](https://neon.com/pricing) |
| Cloudinary | Programmable Media Free, **USD 0**, 25 créditos mensuales compartidos por almacenamiento, transformaciones y entrega. Envía avisos y puede deshabilitar la cuenta si el exceso persiste. El sistema usa el SDK firmado y `res.cloudinary.com`, sin dominio de medios propio. [Planes](https://cloudinary.com/pricing) · [Consumo y avisos](https://cloudinary.com/documentation/billing_and_plans) |
| Resend | Free, **USD 0**, hasta 100 correos transaccionales al día y 3000 al mes. Enviar por HTTPS con un subdominio verificado. Agotar el cupo impide entregar nuevos correos hasta que se libere o se amplíe. La aplicación limita el uso de recuperación a 12 intentos diarios UTC. [Precios de Resend](https://resend.com/pricing) |
| NIC Argentina | Dominio `.com.ar`, **ARS 8.500** por alta y **ARS 8.500** por renovación anual según el arancel publicado. La delegación DNS es gratuita. Confirmar el importe en TAD y elegir un nombre disponible con Sofía. [Arancel oficial](https://www.punto.gob.ar/es/dominios/aranceles) · [Preguntas frecuentes](https://nic.ar/es/ayuda/faq) |
| Cloudflare y monitoreo | DNS autoritativo Free, **USD 0**. UptimeRobot Free admite uso comercial con comprobaciones cada cinco minutos. [DNS de Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) · [Plan gratuito de UptimeRobot](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan) |

El piso recurrente estimado es **USD 5/mes más ARS 8.500/año**, antes de impuestos, conversión de moneda y excedentes. Arrancar con una réplica web y sin volúmenes, servicios auxiliares ni servidores de correo. Elegir regiones cercanas entre Railway y Neon, con São Paulo como primera opción si aparece en ambos paneles. Railway recomienda Pro para aplicaciones comerciales. Hobby es la opción inicial si Sofía acepta operar el workspace y el nivel de soporte del plan. [Planes de Railway](https://docs.railway.com/pricing/plans) · [Preguntas frecuentes de precios](https://docs.railway.com/pricing/faqs)

### Condiciones para lanzar

- GitHub debe contener el SHA aprobado y la demo debe estar separada de sus disparadores. El estado remoto requiere comprobación durante la reunión.
- Neon debe tener una base comercial nueva, las migraciones `0000`–`0008`, las categorías iniciales y la cuenta de Sofía. La 0007 crea la fila de Configuración con valores iniciales que Sofía debe revisar. La 0008 crea la tabla para el cupo de recuperación; su primera fila se crea al reservar un envío.
- La carga de fotos requiere Cloudinary y la recuperación requiere remitente verificado en Resend. Login, subida y callbacks deben probarse bajo el mismo origen HTTPS del panel.
- Confirmar en Railway el arranque con Node y pnpm fijados, la conexión TLS a Neon tras una pausa y el envío de recuperación. La app usa `pg`, con 5 segundos de espera de conexión, almacenamiento de sesión en la base e imágenes fuera del servidor. Enviar correo por la API HTTPS de Resend es compatible con Hobby. [Red saliente de Railway](https://docs.railway.com/networking/outbound-networking)

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
4. Si no se puede verificar la desconexión, conservar el bundle y dejar pendiente el push a `origin`. Como alternativa autorizada posterior, una copia privada en un repositorio nuevo sin integración de Vercel permite preparar Railway sin tocar el repositorio de la demo. Acordar con el titular del código y Sofía quién administra esa copia.

## Reunión de lanzamiento

### 1. Cuentas, dominio e imagen

- **Sofía** crea Railway, Neon, Cloudinary, Resend y Cloudflare con un correo que controla. También mantiene su acceso a NIC Argentina/TAD, Google Search Console y la cuenta de monitoreo. Activa MFA cuando esté disponible, guarda códigos de recuperación en su gestor y autoriza el pago de Railway y el dominio. Confirmar que la cuenta GitHub que autoriza Railway tiene acceso al repositorio privado y que la integración accede solo al repositorio necesario.
- **Desarrollador** guía y prepara los nombres, comandos y DNS. Usar invitaciones nominales y permisos mínimos donde el plan lo permita. Para Railway Hobby, Sofía realiza desde su sesión los pasos que requieren acceso mientras el desarrollador la guía. Las contraseñas, los códigos y los pagos se ingresan en privado, con la pantalla compartida en pausa si corresponde.
- **Dominio.** Sofía ingresa a TAD con CUIT o CUIL y Clave Fiscal, abre NIC Argentina → Registros, Renovaciones y Otras Operaciones, registra el `.com.ar` a título propio o del negocio según corresponda y paga. En Cloudflare agrega el dominio al plan Free. En TAD lo delega a los dos nameservers que Cloudflare asigna. Si ya existen DNS o correo, conservar los registros y revisar DNSSEC antes de cambiar nameservers. Si el DNS, el certificado o el remitente siguen pendientes de verificación al final de la llamada, retomar antes de anunciar la URL. [NIC Argentina](https://nic.ar/es/ayuda/faq) · [Configurar DNS en Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- **Hero.** Sofía entrega y aprueba la foto definitiva antes de fijar el SHA de lanzamiento. El hero actual usa un recurso versionado del repositorio. Incorporar la imagen en un cambio visual separado, revisar recorte y peso en escritorio y móvil y fijar entonces el SHA definitivo. [Componente Hero](../components/boty/hero.tsx)

### 2. Preparar PostgreSQL limpio

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

El aprovisionamiento también necesita `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL`. La contraseña se ingresa de forma oculta en la terminal de Sofía y se guarda en su gestor. El alta bloquea una segunda cuenta y la carga de categorías puede repetirse sin duplicados. No usar `demo:*`, los scripts de reset ni `db:generate` en producción. Confirmar 9 entradas en `drizzle.__drizzle_migrations`, 7 categorías, una fila en `configuracion_negocio` y una sola cuenta en `"user"`. El catálogo arranca vacío. Con `psql`, usar `SELECT current_database(), current_user;` antes de cualquier operación.

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

### 3. Configurar Railway, medios y correo

Crear el proyecto bajo el workspace de Sofía. Primero preparar la base y luego vincular el repositorio privado y la rama aprobada. Si la vinculación inicia el primer deploy, esperar a configurar todas las variables y elegir el SHA verificado antes de abrir tráfico. Desactivar los deploys automáticos y publicar manualmente las revisiones aprobadas. Railpack detecta pnpm en `package.json`; fijar `RAILPACK_NODE_VERSION=24.15.0`, comprobar en el log que se usó pnpm `11.25.0` y conservó el lockfile. Build `pnpm build`, start `pnpm start --hostname 0.0.0.0` usando `PORT` inyectado. El build instala dependencias de desarrollo y descarga las fuentes desde Google Fonts. Para el despliegue usar `/catalogo` como healthcheck, que comprueba lectura de la base además de arranque. Mantener desactivada la suspensión en Railway al lanzar y usar alertas de consumo. El límite duro detiene el servicio si se alcanza. [Node en Railpack](https://railpack.com/languages/node/) · [Healthchecks](https://docs.railway.com/deployments/healthchecks) · [Control de costo](https://docs.railway.com/pricing/cost-control) · [Autodeploy](https://docs.railway.com/deployments/github-autodeploys)

Configurar un entorno de Cloudinary de Sofía, con credenciales separadas de la demo, sin requerir presets sin firma. Guardar los originales de las fotos fuera de Cloudinary. En Resend verificar `correo.<dominio>` para recuperación, copiar a Cloudflare los registros exactos de SPF/DKIM y los demás que indique el panel, y esperar estado **Verified**. Crear una clave de solo envío limitada a ese dominio si la opción está disponible. Desactivar el seguimiento de clics y aperturas para recuperación. El remitente verificado y el buzón real de Sofía cumplen funciones distintas. [Dominios verificados de Resend](https://resend.com/docs/dashboard/domains/introduction)

| Variable de producción | Valor y manejo |
| --- | --- |
| `DATABASE_URL` | **Secreto.** Conexión directa del rol del servidor a la base comercial con TLS y `sslmode=verify-full`. La URL dueña del schema se usa solo desde la terminal de mantenimiento. |
| `BETTER_AUTH_SECRET` | **Secreto.** Generar un valor aleatorio exclusivo de 32 bytes, por ejemplo con `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` en una terminal privada. Custodiarlo para restauración. |
| `BETTER_AUTH_URL` | Origen HTTPS exacto del panel, sin ruta. Si se usa un origen temporal para probar, cambiarlo al comercial antes del lanzamiento. |
| `SITE_URL` | Origen HTTPS comercial para SEO. Dejarlo sin definir hasta aprobar la apertura en el dominio definitivo. |
| `BETTER_AUTH_TRUSTED_IP_HEADER` | Dejarlo sin definir hasta comprobar que el ingreso público de Railway sobrescribe `X-Real-IP`, que la app solo se alcanza por ese ingreso y que el proxy utilizado conserva la propiedad. Luego configurar `x-real-ip`. [Cabeceras de Railway](https://docs.railway.com/networking/public-networking/specs-and-limits) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Nombre del entorno, identificador de credencial y **secreto**. Los tres se configuran del lado servidor. `CLOUDINARY_CARPETA_ENTORNO` queda sin definir en producción. |
| `RESEND_API_KEY`, `RESEND_FROM` | **Secreto** de solo envío y remitente `Angel Tears <cuenta@correo.<dominio>>`. |
| `RAILPACK_NODE_VERSION`, `PORT` | Versión fijada y puerto que inyecta Railway. `ANGEL_TEARS_PREVIEW`, `DATABASE_URL_TEST`, `ADMIN_*` y `DEMO_*` se dejan fuera del servicio comercial. |

Las credenciales se cargan en Variables del servicio, sin prefijo `NEXT_PUBLIC_`, capturas ni mensajes. Los orígenes y el identificador de Cloudinary no son contraseñas. Para acceso técnico, usar cuentas separadas donde exista delegación, y retirar accesos que ya no se necesiten.

### 4. HTTPS, aceptación y entrega

1. Agregar el dominio custom en Railway. En Cloudflare cargar, en modo **DNS only**, el CNAME y el TXT de verificación tal como Railway los muestra. Cloudflare permite CNAME flattening en el dominio raíz. Esperar estado activo y certificado válido. Elegir un solo origen canónico y verificar redirecciones desde variantes si se publican. Mantener el dominio temporal sin difusión y retirarlo si es un alias independiente y la resolución del dominio comercial no depende de él. [DNS para dominios Railway](https://docs.railway.com/integrations/api/manage-domains) · [CNAME flattening](https://developers.cloudflare.com/dns/cname-flattening/)
2. Sofía entra en `/admin/login`, revisa dirección, WhatsApp, Instagram, horarios y mapa en Configuración. Confirma las categorías y publica un primer producto comercial con imagen y stock. Verificar una carga firmada, catálogo/ficha, acciones comerciales relevantes y ausencia de sesión en una ventana privada. Pedir un único correo de recuperación autorizado y probar el enlace, cambio de contraseña y revocación de sesión. Confirmar que logs y monitoreo no guardan URLs completas que llevan tokens.
3. Tras aprobar la apertura, configurar `SITE_URL` y verificar `robots.txt`, `sitemap.xml`, canónicos, datos estructurados y `404` de fichas ocultas. Sofía verifica la propiedad de dominio por DNS en Search Console, envía el sitemap y usa Inspección de URL para solicitar indexación de Inicio y Catálogo. La solicitud no garantiza inclusión inmediata. [Checklist de SEO](features/CIERRE_SEGURIDAD_SEO.md#activar-la-indexación-en-el-dominio-comercial)
4. Entregarle URL del panel, inventario de cuentas y permisos, calendario de renovación, guía, acceso a backups y contacto de incidentes. Sofía conserva propiedad, facturación, correo de recuperación y su contraseña del panel.

## Operación, backups y salida de proveedores

- **Disponibilidad y alertas.** UptimeRobot puede revisar `/robots.txt` cada cinco minutos sin consultar Neon. Este control detecta caída web. Revisar `/catalogo` manualmente o con una comprobación funcional espaciada para que el monitor no mantenga activa la base Free. Activar notificaciones en Railway, comprobar que Cloudinary y Resend avisan al correo de Sofía, y revisar uso del primer mes. Si Resend agota cuota, mantener sesiones vigentes y seguir la [guía de recuperación](features/CIERRE_SEGURIDAD_SEO.md#operación-de-recuperación).
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
- [ ] Hero aprobado, catálogo real, imágenes y WhatsApp probados. Login, cierre de sesión y recuperación comprobados.
- [ ] HTTPS y DNS definitivos, canónicos, robots, sitemap, datos estructurados y Search Console verificados.
- [ ] Sofía recibe accesos, documentación, renovación, límites y alertas. Se acuerda quién hará la siguiente copia y revisará el consumo.

## Ensayo local del procedimiento

El 20/11/2026 se verificó un bundle de `main` y se clonó el SHA aprobado desde esa copia. Con Node 24.15.0 y pnpm 11.25.0 se instaló el lockfile en modo congelado. En un PostgreSQL 17 temporal y vacío se aplicaron las nueve migraciones y se repitieron la carga de categorías y el alta de una cuenta de ensayo. El estado final fue de siete categorías, una configuración, una administradora, cero filas de cuota y cero productos. `pg_dump` y `pg_restore` reprodujeron ese estado en otra base vacía.

Pasó un build de producción y la comprobación HTTP local. Inicio, Catálogo y login respondieron 200. Productos sin sesión redirigió al login. El ensayo no verifica Railway/Linux, TLS de Neon, DNS, Cloudinary ni entrega real de Resend. Esos pasos se comprueban en la reunión y antes de anunciar el sitio.
