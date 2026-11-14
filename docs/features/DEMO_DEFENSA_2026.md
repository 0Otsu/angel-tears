# Preparación de demo para la defensa del 18/11/2026

## Continuación de despliegue autorizada el 14/11/2026

El responsable autoriza ahora validar Neon DEMO, migrar, cargar categorías/usuaria/datos,
configurar Vercel/Cloudinary DEMO, crear commits en español, integrar main sin PR y
publicar sin force push. La prohibición de operaciones remotas de la preparación
descrita debajo es el registro de la etapa anterior, no el alcance vigente.

Comprobación efectiva del 14/11: Neon proyecto `blue-cell-57306547`, rama
`br-odd-butterfly-b6pi58cs` (nombre production, dentro del proyecto DEMO), Free,
São Paulo, PostgreSQL 18.7. La conexión DIRECTA aprobada autenticó a
neondb_owner en neondb, con TLS y certificado verificados desde Node. Cero tablas
públicas y marcador ausente; solo se realizaron SELECT, sin migraciones ni datos.
Vercel existente verificado en Hobby, repositorio correcto y dominio reservado
angel-tears-demo.vercel.app; Node 24.x y Corepack=1 guardados, sin deployment.

El responsable informó exposición de las credenciales anteriores. Se regeneraron
localmente el secreto Auth y la contraseña fuerte ficticia, sin imprimir valores.
El responsable confirmó luego las rotaciones de Neon y Cloudinary y actualizó el
archivo privado. No confirmó exclusividad de la clave antigua de Cloudinary y
prohibió revocarla automáticamente; su alcance y revocación quedan a cargo del titular.
No se alteró ni revocó esa clave. La contraseña ficticia se fortaleció de nuevo
localmente antes del alta, sin mostrarla. Credenciales vigentes: `.env.demo.local`,
fuera de Git. Conexiones directa y pooled comprobadas con `sslmode=verify-full`.

Aplicación efectiva: siete migraciones, siete categorías y una cuenta ficticia en
Neon DEMO; login/logout de Better Auth contra esa base devolvieron 200. Se prepararon
25 referencias reales de Cloudinary usando los tres assets existentes y el prefijo
exclusivo de demo, sin eliminar ni sobrescribir recursos comerciales.

Carga terminada y validada en PostgreSQL 18: 25 productos, cuatro proveedores,
siete categorías, 25 compras (cinco anuladas), 200 ventas (diez anuladas) y
25 gastos (cinco anulados). Stock igual a movimientos, importes de cabeceras y
líneas consistentes y resultados de julio a noviembre iguales a la tabla de este
documento; Collar Aurora conserva cinco unidades. Las 25 URLs de Cloudinary
respondieron correctamente (HEAD). No se ejecutó restablecimiento.

Vercel CLI 65.15.0 autorizada por el titular mediante el flujo de dispositivo,
sin permitir acceso de Chrome a archivos locales. Las siete variables runtime
de Production se cargaron como Secret por stdin desde `.env.demo.local`, sin
valores en argumentos ni logs. DATABASE_URL usa exclusivamente el endpoint
pooled del mismo Neon DEMO; la directa no se carga a Vercel. La vinculación local
`.vercel/` y archivos `.env*` privados quedan ignorados. No se añadió la CLI como
dependencia del proyecto ni se activaron servicios pagos.

Checks de integración previos a publicar: OpenSpec estricto 6/6, checks locales
ya registrados debajo y verificación SQL efectiva correctos. La comprobación
pública de Vercel se realizará después de publicar main; aún no acredita despliegue.

Para la ejecución automatizada se admite `DEMO_ADMIN_CONTRASENA` exclusivamente en
`.env.demo.local` ignorado o entorno local: el wrapper lo pasa al comando existente
por entorno, nunca por argumentos ni logs. No se copia a Vercel.

`pnpm demo:imagenes --confirmar=imagenes:angel-tears-demo` reutiliza las tres imágenes
de producto ya versionadas en public/images/products. No descarga recursos ajenos ni
genera imágenes nuevas. Usa el adaptador actual, 25 public IDs deterministas bajo
`angel-tears/demo-20261118/productos/`, sin sobrescribir ni eliminar assets. Escribe
únicamente el manifiesto ignorado `work/demo-imagenes.json`. Exige primero endpoint
y marcador demo verificados; usa las tres CLOUDINARY_* del archivo privado y el
prefijo `CLOUDINARY_CARPETA_ENTORNO=demo-20261118`. No confundir con imágenes distintas
por cada modelo: son recursos visuales reutilizados del catálogo ficticio original.

`pnpm demo:validar` verifica por consultas de solo lectura los conteos, anulaciones,
igualdad stock/movimientos, cinco unidades reservadas, cabeceras/subtotales/precios,
resultados mensuales, principales de galería y ausencia de fechas posteriores al corte.
No ejecuta limpieza ni modifica datos. Después de practicar, conteos/saldo pueden
diferir del conjunto inicial; no ejecutar reset automáticamente para hacerlos coincidir.

## Registro de preparación local anterior (alcance ya ampliado arriba)

Tarea operativa autorizada por Augusto el 14/11/2026 sobre `4112df3`.
No agrega RF/CU ni reglas comerciales. Referencias académicas canónicas: pendientes
de formalización según TRAZABILIDAD_MVP. Reutiliza ADR-003/004/007, REGLAS_DOMINIO y
los servicios actuales. Vercel Hobby y Neon Free ya creados; sin Resend.
La autorización actual termina en preparación y pruebas locales: sin conexiones a
Neon, migraciones remotas, cargas, usuarios remotos, deploy, merge, commit ni push.

## Cambios y criterios

- Next 16.0.10 → 16.4.6 y eslint-config-next alineado; React/React DOM 19.2.9
  (misma rama 19.2), sharp 0.35.5. Sin actualización general de dependencias.
- Retirar footer obsoleto del shell funcional. Configuración sigue fuera del menú;
  no se implementa ni se maquilla su estado pendiente. Conservar aclaración económica.
- `ANGEL_TEARS_PREVIEW` se deja sin definir; no hace falta editar el banner condicional.
- `pnpm build` fija Webpack como en la evidencia previa; `vercel.json` utiliza ese
  mismo comando, preset Next y región São Paulo `gru1`.
- Carga determinista, sin compras duplicadas como gastos ni fabricación automática.
- Migraciones SQL y esquema de aplicación intactos. Preparación de categorías idempotente.
- Sin signup público: wrapper del comando existente crea solo la identidad ficticia
  `demo.angeltears@example.com`, con contraseña solicitada de forma oculta.

Seguridad consultada: [Server Actions DoS](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r),
[release 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6),
[aviso de noviembre](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385),
[React RSC](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3),
[sharp relacionado](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
Se conservan Better Auth y su esquema; no se migra React a 19.3.

## Plan y consistencia

`pnpm demo:plan` calcula el conjunto sin abrir conexiones ni escribir archivos.
25 productos, cuatro proveedores ficticios sin contactos personales, 25 compras
(cinco anuladas), 200 ventas (diez anuladas, comprador omitido) y 25 gastos (cinco
anulados). Categorías: las siete aprobadas. Fechas comerciales desde julio hasta
14/11/2026. Los timestamps de carga/anulación son los reales al ejecutar, como en la app.

| Mes | Ventas vigentes | Compras vigentes | Gastos vigentes | Resultado |
| --- | ---: | ---: | ---: | ---: |
| Julio | 1.450.000 | 650.000 | 140.000 | 660.000 |
| Agosto | 1.620.000 | 720.000 | 160.000 | 740.000 |
| Septiembre | 1.850.000 | 810.000 | 170.000 | 870.000 |
| Octubre | 2.020.000 | 900.000 | 190.000 | 930.000 |
| Noviembre parcial | 960.000 | 430.000 | 85.000 | 445.000 |

Promedio de los cuatro meses completos: $800.000. Se compone cada ticket con
productos y cantidades; costos y gastos con centavos enteros. Los totales de
cabeceras los calculan los servicios de negocio, no se insertan resúmenes.
Compras abastecen antes de vender; anulaciones usan sus servicios de reversión.
Las flores terminadas tienen stock propio; los insumos son gastos sin transformación.
Hay productos ocultos, destacados, pocas unidades y agotados.

Producto reservado: **Collar Aurora**, ID `b7201708-2612-4bee-8069-537a2c454ea6`.
Solo un ajuste INICIAL identificado de cinco unidades; ninguna compra/venta histórica
lo consume. Durante la exposición: compra 3, venta 1 → saldo 7.

## Protección y repetición

Los comandos leen exclusivamente `.env.demo.local`/variables `DEMO_*`. Nunca usan
`DATABASE_URL` como fallback. Solo aceptan el host DIRECTO confirmado
`ep-falling-pond-b6o6kria.c-2.sa-east-1.aws.neon.tech`, base `neondb`, rol
`neondb_owner`, PostgreSQL 18 o posterior, SSL y opciones permitidas. Rechazan pooler,
otros hosts/bases/roles, parámetros de red adicionales y ejecución desde Vercel.
Los errores no imprimen URL, secretos, SQL ni stack. El host es identificador público,
no credencial; no se versionan contraseña ni cadenas de conexión.

Antes de toda escritura exigen el comentario de base exacto
`angel-tears-demo:20261118:v1`. Es un marcador operativo, sin tabla nueva ni cambio
del esquema de la aplicación. Debe colocarlo una persona **después** de verificar
el proyecto y autorizar esa próxima etapa. `demo:verificar` solo consulta identidad
y presencia del marcador; tampoco se ejecuta durante esta preparación.

Cada mutación requiere `--confirmar=<operacion>:angel-tears-demo`; reset exige su
propia confirmación. La carga/reset ocurre en una transacción con lock y savepoints;
cualquier rechazo revierte todo. UUID/claves estables y servicios idempotentes evitan
duplicar operaciones. Repetir no sobrescribe productos ya existentes ni revierte
las operaciones hechas durante la exposición. Para volver al inicio usar el reset.

Reset comprueba que hay una sola usuaria con el email ficticio, productos/proveedores
exclusivos del plan y operaciones del mismo actor. Si hay datos ajenos, aborta.
Trunca únicamente las once tablas comerciales enumeradas, sin CASCADE, y vuelve a
sembrar en la misma transacción. Conserva categorías, credenciales, sesiones,
migraciones y cualquier otra tabla. No elimina recursos de Cloudinary: se reutilizan
referencias del manifiesto. No es un comando de limpieza de producción.

## Imágenes autorizadas

Cloudinary sigue pendiente. No se reutilizan automáticamente fotos comerciales,
se descargan imágenes ajenas ni se crean referencias ficticias de proveedor.
Configurar un cloud/entorno Free destinado a demo y
`CLOUDINARY_CARPETA_ENTORNO=demo-20261118` en Vercel. Ambos endpoints de upload
usan ese prefijo incluso con NODE_ENV=production; vacío conserva el comportamiento anterior.
Preferir un cloud separado: la carpeta sola no es un límite de permisos de la cuenta.

Preparar un JSON local (no versionado), indicado por `DEMO_IMAGENES_ARCHIVO`.
Es un objeto cuyas claves son IDs de productos de `demo:plan` y valores son las
referencias **reales** de imágenes autorizadas ya subidas:

```json
{
  "ID_PRODUCTO_DE_DEMO_PLAN": {
    "assetId": "ASSET_ID_REAL",
    "publicId": "angel-tears/demo-20261118/productos/ID_PRODUCTO_DE_DEMO_PLAN/RECURSO",
    "versionProveedor": "VERSION_NUMERICA_REAL",
    "urlSegura": "https://res.cloudinary.com/CLOUD_DEMO/image/upload/vVERSION_NUMERICA_REAL/angel-tears/demo-20261118/productos/ID_PRODUCTO_DE_DEMO_PLAN/RECURSO.webp",
    "ancho": 800,
    "alto": 800,
    "formato": "webp"
  }
}
```

Son placeholders, no assets disponibles. La validación exige cloud, prefijo,
dimensiones/formato y referencias de todos los productos a publicar (23). Si faltan,
aborta antes de conectar/escribir. Los otros dos productos pueden seguir ocultos.
No hace llamadas a Cloudinary: verificar existencia y autorización de cada imagen
al preparar el manifiesto. JPEG usa extensión `.jpg`; también admite PNG y WebP.

## Procedimiento preparado (autorizado y ejecutándose en la continuación)

1. Copiar `.env.demo.example` a `.env.demo.local`, sin versionarlo. Completar la URL
   DIRECTA desde Neon con SSL, secreto Auth independiente de al menos 32 caracteres,
   dominio HTTPS estable de Vercel y datos del manifiesto. No pegar secretos en chats.
2. Ejecutar `pnpm demo:verificar`: consulta identidad sin mutaciones. Contrastar en
   consola Neon proyecto `angel-tears-demo`, Free, AWS São Paulo, neondb/neondb_owner.
3. Una vez aprobado el destino, ejecutar desde SQL Editor **de ese proyecto**:
   `COMMENT ON DATABASE neondb IS 'angel-tears-demo:20261118:v1';`
   Volver a verificar que `marcadorCorrecto` sea true.
4. Ejecutar, en este orden:

```powershell
pnpm demo:migrar --confirmar=migrar:angel-tears-demo
pnpm demo:categorias --confirmar=categorias:angel-tears-demo
pnpm demo:administradora --confirmar=administradora:angel-tears-demo
pnpm demo:seed --confirmar=seed:angel-tears-demo
```

El wrapper de migración usa el migrador Drizzle y los siete SQL existentes, sin
generate/push y sin leer la configuración de desarrollo. El alta llama al script
Better Auth existente con DATABASE_URL directa y valores Auth demo explícitos;
no habilita registro en la aplicación. La contraseña se pide en terminal, sin argumentos.
Para rehacer **solo** el conjunto de demo, tras confirmar que se perderán sus operaciones:
`pnpm demo:restablecer --confirmar=restablecer:angel-tears-demo`.

5. Revisar diff y checks antes de autorizar integración/publicación. El proyecto
   Vercel sigue `main`: esta rama no se publicará hasta integrar/pushear explícitamente.
6. En el proyecto Vercel existente: Hobby, raíz `.`, Next.js, Node **24.x**,
   `ENABLE_EXPERIMENTAL_COREPACK=1`, pnpm 11.25.0 y `pnpm install --frozen-lockfile`.
   `vercel.json` fija Webpack y São Paulo. Salida automática de Next; no export estático.
7. Variables **Production** del proyecto aislado de demo: `DATABASE_URL` **POOLED**,
   `BETTER_AUTH_SECRET` igual al secreto demo, `BETTER_AUTH_URL` dominio HTTPS definitivo,
   las tres `CLOUDINARY_*` y `CLOUDINARY_CARPETA_ENTORNO=demo-20261118`.
   No cargar DEMO_*, ADMIN_*, DATABASE_URL_TEST ni Resend en Vercel.
   Dejar `ANGEL_TEARS_PREVIEW` sin definir y `SITE_URL` vacío para noindex.
   No activar integraciones que creen otra base ni copiar secretos comerciales.
8. Desplegar solo tras completar datos/imágenes y autorizarlo. Probar login/logout,
   rutas privadas sin sesión, Resumen/mes anterior, catálogo, publicación, imágenes,
   historial y el recorrido 5+3-1=7. Verificar que no se muestre el banner ni la toolbar
   de Preview en la URL usada para exponer. No desactivar CSRF para usar URLs temporales.

## Pruebas y límites de evidencia

Unitarias del plan: validadores comerciales, fechas, fórmula, anulaciones,
simulación cronológica no negativa, claves estables y reserva. Guards con dobles:
host/base/rol/SSL/marcador, confirmación diferenciada y ausencia de secretos.
Manifiesto: incompleto, cloud comercial o prefijo incorrecto se rechazan.
Suite de componentes y checks técnicos: resultados al finalizar esta intervención.
La suite completa detectó una expectativa obsoleta ya presente en `4112df3`:
Stock esperaba `text-primary` aunque EtiquetaEstado ya usa `text-success` desde
la recuperación visual. Se corrige solo esa aserción, sin cambiar la UI ni omitir tests.
Next 16.4.6 regenera `next-env.d.ts` incorporando sus tipos `root-params`.

Ejecución local del 14/11/2026: **84 archivos / 744 pruebas unitarias y de componentes
correctas**, `pnpm build` (Webpack), `pnpm typecheck`, ESLint con cero warnings,
`pnpm db:check`, instalación con lockfile congelado y `git diff --check` correctos.
El build se realizó sin archivo de conexión local ni consultas a Neon. Se ejecutó
solo `demo:plan`, nunca verificar/migrar/categorías/administradora/seed/reset.
No hay cambios en `drizzle/` ni en schemas. No se hicieron commits, merge ni push
de esta preparación; el avance inicial de main fue exclusivamente fast-forward.

No ejecutar el seed ni siquiera como validación remota en esta etapa.
Integración SQL/idempotencia/rollback/reset sobre PostgreSQL 18 y recorrido Vercel
permanecen pendientes; las pruebas puras no acreditan esas ejecuciones.
No hay base aislada configurada en este checkout y Docker no está activo. No se
inició ni instaló ningún servicio. E2E transaccionales no ejecutados por ese motivo.
OpenSpec CLI no está disponible en PATH; no se instaló ni se alteraron los changes
de producto. Su validación permanece como check previo a una eventual integración.
