# Desarrollo y colaboración

## Estado y preparación

Existe una UI foundation ejecutable en App Router con público y administración visual. Los mocks no guardan información. El acceso administrativo solo navega; no autentica.

El bootstrap del 16/10/2026 y la arquitectura/OpenSpec del 19/10/2026 están autorizados. Stack complementario aceptado en ADR-003..008, sin integración funcional. Fuentes académicas canónicas/trazabilidad y pendientes de producto/operación siguen abiertos.

## Trabajo de humanos y agentes

1. Definir tarea mediante [OpenSpec](OPENSPEC.md), cubriendo las secciones de [la plantilla de feature](features/TEMPLATE.md) sin duplicarlas. Referenciar fuentes RF/CU reales; si faltan, marcar pendiente, no inventar ni declarar aceptación formal.
2. Leer las fuentes y documentos obligatorios de [AGENTS.md](../AGENTS.md).
3. Identificar reglas aplicables, criterios de aceptación, supuestos y decisiones necesarias. Resolver cambios de alcance, reglas o arquitectura mediante revisión humana y las fuentes de mayor prioridad.
4. Crear una rama acotada y trabajar según [GIT_WORKFLOW.md](GIT_WORKFLOW.md).
5. El responsable revisa lo asistido por IA y debe poder explicarlo; ejecutar los tests correspondientes.
6. Antes del merge, integrar main reciente de forma segura, resolver conflictos entendidos y comprobar [la definición de terminado](DEFINICION_TERMINADO.md): tests aplicables, lint/typecheck/build, OpenSpec y diff. Con checks correctos, mergear a main, push y avisar al equipo.

La IA no sustituye las fuentes ni responsabilidad humana. R1: Emi Auth/Cuenta; Claudio Inventario/Proveedores/Compras; Augusto Productos/Público/SEO. [Blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md) fija modelo/contratos/archivos y coordinación de dependencias/migraciones. R2/R3 sin owners. El workflow vigente de esta etapa no exige PR, aprobación de otro integrante ni revisión cruzada; otra revisión es recomendable, no un gate. Se mantienen ramas individuales, sincronización, coordinación, checks, trazabilidad y alcance.

## Idioma y nomenclatura

Documentación interna en español. Mantener `README.md`, `AGENTS.md` y `CLAUDE.md` como nombres estándar reconocidos por herramientas. Conservar nombres obligatorios de frameworks y librerías.

Para dominio y código futuro, usar español sin tildes ni ñ en identificadores:

- Módulos: `productos`, `inventario`, `proveedores`, `compras`, `ventas`, `egresos`, `reportes`, `autenticacion`.
- Funciones: `registrarVenta`, `anularCompra`, `consultarStockBajo`.
- Archivos: `registrar-venta.ts`, `reglas-stock.ts`.

Son ejemplos de nomenclatura; no son archivos o funciones a crear ahora. `.editorconfig` fija UTF-8, fin de línea LF e indentación de dos espacios como base editorial.

## Dependencias y decisiones

Justificar necesidad/impacto de dependencias en el slice. Drizzle/pg, Better Auth/Resend, Zod, Vitest/RTL/Playwright y Cloudinary ya tienen decisión en ADR; no se instalan como efecto del blueprint. Hosting/DB administrada/observabilidad/analytics/CI avanzado siguen pendientes. Tailwind/Boty son referencia visual, no fuente de requisitos. Cambios funcionales nuevos se proponen antes de ejecutar.

## Ejecución local

Node 24.15.0 y pnpm 11.25.0. `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm start`. El script dev usa webpack; build usa Next con validación de tipos activa. ESLint flat config hereda Next core-web-vitals y TypeScript, sin desactivar reglas. Arnés de tests: ver «Pruebas» abajo; hoy cubre infraestructura y el formulario de acceso, no reglas de negocio.

Los scripts nativos permitidos de pnpm están limitados a sharp y unrs-resolver; `esbuild` (dependencia transitiva de Vitest y drizzle-kit) queda explícitamente en `false` en `pnpm-workspace.yaml`. Ver historia en [MIGRACION_UI.md](MIGRACION_UI.md). `work/` contiene evidencia local no versionada. La UI foundation no necesita secretos; la base de datos sí necesita variables locales (ver abajo).

### Base de datos local y pruebas de integración

Requiere una instancia de PostgreSQL local. Crear el rol `angel_tears` y las bases `angel_tears_dev` y `angel_tears_test` con `psql -U postgres -h localhost -f scripts/db/crear-bases-locales.sql` (pide la contraseña del superusuario y define la del rol por entrada oculta; es idempotente y solo para desarrollo local). Copiar `.env.example` a `.env.local` (Git lo ignora) y completar la contraseña.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Base de desarrollo de la aplicación y de `drizzle-kit`. |
| `DATABASE_URL_TEST` | Base aislada para pruebas de integración. Debe ser local, terminar en `_test` y ser distinta de `DATABASE_URL`; el guard (`pruebas/guardia-url-bd.ts`) se niega a ejecutar contra otra. |
| `BETTER_AUTH_SECRET` | Secreto con el que Better Auth firma cookies y tokens. Largo y aleatorio, distinto en cada entorno, nunca versionado (el comando para generar uno está en `.env.example`). |
| `BETTER_AUTH_URL` | URL pública de la aplicación; en desarrollo, `http://localhost:3000`. |

`pnpm db:generate`, `pnpm db:migrate` y `pnpm db:check` usan Drizzle Kit; los schemas viven en `lib/infraestructura/esquemas/*.ts` y las migraciones en `drizzle/`. La conexión es `lib/infraestructura/db.ts`, solo servidor. Tras clonar o actualizar `main`: `pnpm db:migrate` aplica las migraciones pendientes a tu base de desarrollo.

**Autenticación (migración `0000_auth-base`).** Crea las tablas de Better Auth (`user`, `session`, `account`, `verification`, `rate_limit`) a partir de `lib/infraestructura/esquemas/auth.ts`. La configuración de Better Auth está en `lib/infraestructura/auth-config.ts` y la instancia de la aplicación en `lib/infraestructura/auth.ts` (solo servidor). El schema se generó con la CLI de Better Auth 1.7.11 y se ajustó a mano (fechas `timestamptz`, índices de vencimiento, unicidad de cuenta por proveedor); el encabezado del archivo lista los ajustes. Para regenerarlo al actualizar Better Auth o sumar plugins:

```
pnpm dlx auth@1.7.11 generate --config scripts/auth/config-generar-schema.ts --output lib/infraestructura/esquemas/auth.ts --yes
```

y volver a aplicar los ajustes, revisar el diff y generar una migración nueva (nunca editar la `0000`).

### Pruebas

Stack de [ADR-006](adr/ADR-006-testing.md). Una vez: `pnpm install --frozen-lockfile` y `pnpm exec playwright install chromium` (descarga el navegador de los E2E, unos 120 MiB; no forma parte de `node_modules`).

| Comando | Qué ejecuta | Requiere |
| --- | --- | --- |
| `pnpm test` | Vitest, proyectos `unitarias` (`*.test.ts`) y `componentes` (`*.test.tsx`, React Testing Library con jsdom). | Nada externo. |
| `pnpm test:integration` | Vitest, proyecto `integracion` (`*.integracion.test.ts`) contra PostgreSQL real. Antes de las pruebas aplica las migraciones a la base `_test`, una sola vez por corrida (`pruebas/preparar-integracion.ts`). Falla de forma explícita si falta `DATABASE_URL_TEST`; no se da por pasada una prueba que no pudo ejecutarse. | Base `_test` local. |
| `pnpm test:e2e` | Playwright (carpeta `e2e/`, `*.spec.ts`). Hace `pnpm build`, levanta `pnpm start` en el puerto 3100 y prueba en Chromium. | Navegador instalado; la base `_test` cuando los tests la usen. |

Los E2E nunca usan la base de desarrollo: el servidor recibe `DATABASE_URL_TEST` validada por el guard y, si falta, una `DATABASE_URL` vacía. El correo de recuperación se probará con un doble que reemplace a Resend (tarea 3.1): ningún test envía correos reales ni usa servicios o datos productivos. No hay CI configurado; estos comandos se ejecutan en local. OpenSpec global 1.14.3 y seis skills de Codex se documentan en OPENSPEC; su instalación no modifica package/lock. Solo tres changes activos; no ejecutar apply/archivar automáticamente.

### Contrato `exigirAdministradora`

Es la única forma en que los demás módulos conocen la identidad de la Administradora (blueprint, sección 6). Vive en `lib/modulos/autenticacion/`: `contrato.ts` (puro: tipos, `ErrorSesionRequerida`, `crearExigirAdministradora`) y `exigir-administradora.ts` (instancia de la aplicación, solo servidor).

```ts
const administradora = await exigirAdministradora(await headers()) // { id, nombre, email }
```

- Llamarlo en el servidor, **antes de cualquier efecto**, junto a cada lectura privada y en cada Server Action o Route Handler que modifique datos. Un layout, un proxy o ocultar un enlace no lo sustituyen.
- Sin sesión válida (ausente, vencida o revocada, sin distinguirlas) lanza `ErrorSesionRequerida` (`codigo: "SESION_REQUERIDA"`); el módulo traduce eso a su resultado tipado o a una redirección a `/admin/login`.
- Si el verificador falla por un problema técnico (por ejemplo, base caída), el error se propaga: nunca se concede acceso.
- Devuelve solo `id`, `nombre` y `email`; jamás hash, token ni datos de sesión.
- **Estado actual:** la instancia de la aplicación (`exigir-administradora.ts`) valida la **sesión real de Better Auth** desde la cookie de la solicitud (tarea 2.4): sin sesión, con sesión vencida, revocada o con la cookie manipulada lanza `ErrorSesionRequerida`.
- **Comandos privados (Server Actions y Route Handlers que modifican datos):** usar `conAdministradora(exigirAdministradora, await headers(), async (administradora) => { ... })`. Sin sesión devuelve `{ estado: "sesion_requerida" }` y el comando **no se ejecuta**; nunca reintenta ni reenvía solo, así una sesión vencida al enviar no produce efectos ni duplicados. El llamador responde pidiendo iniciar sesión; en los formularios solo se conservan campos no sensibles y se limpian las contraseñas.
- **Páginas y layouts del panel:** `exigirAdministradoraEnPagina()` (`guardia-admin.ts`) redirige a `/admin/login` sin sesión. **Toda `page.tsx` nueva bajo `app/admin/(panel)/` debe llamarla** (un layout no se vuelve a ejecutar al navegar entre páginas); una prueba (`guardia-paginas-admin.test.ts`) falla si falta. Las páginas con sesión son dinámicas: Next no las cachea.
- **Cómo probar un módulo propio sin la base ni la sesión real:** crear una instancia con `crearExigirAdministradora(verificadorFalso)` e inyectarla en el caso de uso (ver el consumidor de prueba en `contrato.test.ts`). Eso prueba que el módulo exige la sesión y no hace nada sin ella. Con sesiones reales contra PostgreSQL, ver `sesion.integracion.test.ts`.

### Alta de la Administradora

No existe registro público (`/register` ni ningún endpoint de alta): la única cuenta se crea con un procedimiento controlado, desde una terminal, por una persona. Detalles de diseño en [ADR-004](adr/ADR-004-better-auth-resend.md).

```
pnpm auth:crear-administradora
```

1. Tener las migraciones aplicadas (`pnpm db:migrate`) y `DATABASE_URL`, `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` en `.env.local`. **El script actúa sobre la base de `DATABASE_URL`**: revisar a cuál apunta antes de ejecutarlo.
2. El script pide email, nombre y contraseña (con entrada oculta y confirmación). La contraseña tiene entre 8 y 128 caracteres.
3. **No acepta argumentos de línea de comandos** y aborta si recibe alguno: quedarían en el historial del terminal. Para un entorno sin terminal interactiva se pueden definir `ADMIN_EMAIL`, `ADMIN_NOMBRE` y `ADMIN_CONTRASENA` solo para ese comando (por ejemplo en `$env:` de la sesión de PowerShell), nunca en un archivo versionado.
4. **Nunca imprime ni registra la contraseña.** Si algo falla muestra solo el mensaje, sin traza ni datos de la solicitud.
5. **Es seguro repetirlo.** Si ya existe una cuenta no crea otra ni modifica la existente (ni su contraseña), con cualquier email. Un lock de PostgreSQL impide que dos ejecuciones simultáneas creen dos cuentas. Crear la cuenta no inicia ninguna sesión.
6. **Recuperar o cambiar la contraseña** no se hace con este script: se usa el flujo de recuperación por email y el cambio autenticado en `/admin/cuenta` (tareas 3.x). Si hubiera que rehacer la cuenta en un entorno de desarrollo, se borran las filas de `user` (en cascada se borran sus cuentas y sesiones) y se vuelve a ejecutar el script.
7. Ningún archivo de la aplicación puede importar el módulo de alta (`lib/modulos/autenticacion/aprovisionar-administradora.ts`) ni habilitar el registro: una prueba (`alta-fuera-de-la-app.test.ts`) lo verifica.

Pendiente: el procedimiento en producción y el soporte seguro si se pierde el acceso al email dependen del hosting y de la base administrada, aún sin decidir.

### Login de la Administradora

`/admin/login` inicia sesión con Better Auth: el formulario (`components/admin/formulario-login.tsx`) usa el cliente `lib/infraestructura/auth-cliente.ts` y habla con `app/api/auth/[...all]/route.ts`, que atiende cualquier solicitud dentro de `atenderSolicitudAuth` (`lib/infraestructura/auth-manejador.ts`). La cookie de sesión la gestiona la librería (`HttpOnly`, `SameSite=Lax`, `Secure` en producción); el código nunca guarda tokens en el navegador.

- **Errores (matriz del change `implement-admin-auth-account`):** credenciales incorrectas y correo inexistente devuelven exactamente la misma respuesta (`401 INVALID_EMAIL_OR_PASSWORD`) y el mismo texto, sin revelar si la cuenta existe; el formulario conserva el correo y borra la contraseña. Entradas mal formadas dan 4xx sin sesión. Una falla interna (por ejemplo, base de datos caída) responde `503 SERVICIO_NO_DISPONIBLE` o `500 ERROR_INESPERADO` con un texto genérico: nunca SQL, trazas, hosts, tokens ni secretos, ni en la respuesta ni en los logs (el log solo registra el tipo de error y su código).
- **Límite de intentos.** Persistente en la tabla `rate_limit` y activo en todos los entornos. Los valores son los **por defecto de Better Auth 1.7.11**, no valores aprobados por producto: las reglas especiales de la librería admiten 3 solicitudes por ventana de 10 s y por IP en `/sign-in*`, `/sign-up*`, `/change-password*` y `/change-email*`, y 3 por ventana de 60 s en `/request-password-reset` (los tests de integración lo comprueban); el resto del endpoint, 100 por ventana de 10 s. Es temporal por construcción (al vencer la ventana se puede volver a intentar), así que no bloquea de forma indefinida a la única administradora. Limitaciones conocidas: cuenta por IP, no por correo. Next le entrega la IP a Better Auth incluso sin proxy (verificado con un servidor de producción: tres intentos y el cuarto da 429), **pero Better Auth confía en la cabecera `x-forwarded-for` que mande el cliente: si el servidor se expone directamente, quien rote esa cabecera en cada intento evade el límite** (verificado: seis intentos con seis IP falsas distintas, ninguno limitado). En producción la aplicación debe ir **detrás de un proxy o del hosting que sobrescriba esa cabecera**, y hay que configurar en Better Auth cuáles son los proxies de confianza o la cabecera propia del proveedor (`advanced.ipAddress`). Esa configuración y los valores definitivos quedan **pendientes del hosting** y de la operación; mientras tanto, la contraseña de la Administradora es la defensa principal (su política de complejidad todavía no está definida: hoy solo se exige un mínimo de 8 caracteres).
- **Sesión (2.5).** Máximo **absoluto de 30 días desde el login** (`session.expiresIn` = 2.592.000 s). Por defecto Better Auth renueva el vencimiento cuando se usa la sesión (ventana deslizante, `updateAge` de 1 día); `session.disableSessionRefresh: true` lo impide, de modo que `expires_at` queda fijo en login + 30 días aunque se use todos los días, y al vencer hay que iniciar sesión de nuevo (la cookie dura lo mismo, `Max-Age` = 2.592.000, `HttpOnly`, `SameSite=Lax`, `Secure` en producción). Sin `cookieCache`: cada solicitud consulta la sesión en la base, así que cerrar sesión o revocarla surte efecto al instante. **Evidencia** (`sesion.integracion.test.ts`, con el reloj simulado): uso diario durante 29 días sin que cambie el vencimiento, aceptada 1 s antes del límite y rechazada 1 s después; con `disableSessionRefresh: false` ese test falla el día 1 (el vencimiento se corre un día), con `true` pasa. Cerrar sesión borra la fila de la base y limpia la cookie; cerrar una sesión no cierra las demás.
- **Pruebas:** componente (`formulario-login.test.tsx`), integración contra PostgreSQL con solicitudes reales al handler (`login.integracion.test.ts`), unitaria del envoltorio y E2E en navegador con una cuenta sembrada en la base de pruebas (`e2e/`). Los E2E requieren `DATABASE_URL_TEST`.

### Cuenta y cambio de contraseña

`/admin/cuenta` (en el menú como «Cuenta») muestra el nombre y el correo de la Administradora **de solo lectura** (no hay edición de identidad, perfil ni roles), el formulario para cambiar la contraseña y el acceso a «Cerrar sesión». `/admin/configuracion` **no** es la cuenta: queda reservada solo al tema claro/oscuro persistente de `/admin/*`, sin efectos en la parte pública, y pertenece a la Ronda 3 (hoy sigue siendo la pantalla de muestra).

**Política del cambio autenticado** (`DECISIONES_PRODUCTO_MVP.md`, sección 10, 21/10/2026): se verifica la contraseña actual, **se conserva la sesión desde la que se hace el cambio sin extender su máximo de 30 días** y se invalidan todas las demás. En la recuperación por email rige otra política (se invalidan todas y se vuelve a iniciar sesión).

**Cómo se implementa y por qué en dos pasos** (`lib/modulos/autenticacion/cambiar-contrasena.ts`): primero `changePassword` **sin** `revokeOtherSessions` y después el endpoint nativo `/revoke-other-sessions`, que borra solo las otras sesiones. La opción `changePassword({ revokeOtherSessions: true })` de Better Auth 1.7.11 **no cumple la política**: borra todas las sesiones (también la actual), crea una nueva y fija otra cookie, o sea que reemplaza la sesión y le reinicia los 30 días. Está comprobado por una prueba de caracterización (`cuenta.integracion.test.ts`); si una versión futura de la librería cambia ese comportamiento, la prueba avisa.

Los dos pasos no son atómicos. Si el segundo falla, la contraseña ya cambió y las otras sesiones siguen abiertas: el formulario lo informa y ofrece «Cerrar mis otras sesiones» para reintentarlo (repetirlo es inofensivo). El cambio usa el cliente de Better Auth contra `/api/auth/*`, de modo que pasa por el límite de intentos: `/change-password` tiene la misma regla que el login (3 por ventana de 10 s): es la regla por defecto de la librería para endpoints que verifican credenciales, no una configuración nuestra ni un valor de producto; revisar al operar. La nueva contraseña debe tener entre 8 y 128 caracteres; la política de complejidad sigue sin definirse. Los mensajes no incluyen detalle técnico y las contraseñas se borran del formulario ante cualquier error del servidor y al terminar.

**Pruebas:** orquestación (`cambiar-contrasena.test.ts`), formulario (`formulario-cambio-contrasena.test.tsx`), integración con el cliente real de Better Auth contra PostgreSQL y el reloj simulado (`cuenta.integracion.test.ts`: misma sesión y mismo vencimiento, otras sesiones cerradas, contraseña actual incorrecta, sin sesión, límite de intentos, falla del segundo paso) y E2E con dos dispositivos (`e2e/cuenta.spec.ts`).

### Recuperación de contraseña por correo

Flujo (decisiones J1 a J4 y cierre de Auth del 19/10/2026): `/admin/login` → «¿Olvidaste tu contraseña?» → `/admin/recuperar` (correo) → respuesta neutra → correo con un enlace → `/admin/restablecer` (contraseña nueva) → vuelta al login. **El enlace dura 1 hora, sirve una sola vez, al usarlo se cierran todas las sesiones y no se inicia sesión automáticamente.**

**Correo (tarea 3.1).** Better Auth genera y valida el token; **Resend solo entrega el mensaje** (`lib/infraestructura/correo.ts`, plantilla en `correo-recuperacion.ts`) y no se usa para nada más. Se configura con `RESEND_API_KEY` y `RESEND_FROM` (ver `.env.example`); sin ellas la aplicación funciona y el pedido responde igual, pero no sale ningún correo. El enlace se arma con `BETTER_AUTH_URL`, nunca con el host de la solicitud (hay un test con un host falso). El mensaje no lleva imágenes ni rastreo.

- **Respuesta neutra.** Exista o no la cuenta, llegue o no el correo, el pedido responde exactamente lo mismo (misma respuesta del servidor y mismo texto en pantalla). Para que tampoco se pueda deducir por el tiempo, el envío se hace **después de responder** (`advanced.backgroundTasks` con `after` de Next); sin eso Better Auth espera al proveedor y el pedido tardaría más cuando la cuenta existe. Un fallo del proveedor se registra solo con el tipo y el código de error: nunca la URL, el token ni el correo.
- **Límite de pedidos:** regla por defecto de la librería, 3 por ventana de 60 s por IP. Con ese valor se pueden mandar hasta 180 pedidos por hora; si la cuota de Resend es menor, conviene una ventana más larga (decisión pendiente, no hay valores de producto).
- **Verificación de origen fijada explícitamente** (`disableOriginCheck` y `disableCSRFCheck` en `false`): Better Auth las apaga solo cuando `NODE_ENV=test`, por lo que sin esto los tests no probaban nada y un entorno mal configurado podía dejarlas apagadas. Con ellas, un `redirectTo` hacia otro origen se rechaza y un pedido que cambia estado desde otro origen con una sesión abierta recibe 403.
- **Probar a mano sin dominio propio:** crear una cuenta en Resend, generar una clave y usar el remitente de pruebas de Resend (`onboarding@resend.dev`), que solo entrega al correo con el que se registró la cuenta de Resend; la cuenta de la Administradora debe usar ese mismo correo. En producción hace falta un dominio remitente verificado (pendiente del hosting).

**Restablecer (tarea 3.2).** Consumir el enlace, cambiar la contraseña y cerrar todas las sesiones ocurren **en una sola transacción** de PostgreSQL: si algo falla, nada cambia y el enlace sigue vigente (hay un test que fuerza el fallo con un trigger). Dos intentos simultáneos con el mismo enlace: solo uno gana. Una contraseña nueva rechazada (largo) **no gasta** el enlace. El enlace pasa por `/api/auth/reset-password/<token>`, que redirige a `/admin/restablecer?token=...` (o `?error=INVALID_TOKEN`); la página no se indexa y no manda el `Referer` (`referrer: no-referrer`). La política de complejidad de la contraseña no está definida: solo se exige un largo de 8 a 128 caracteres.

**Hallazgos de Better Auth 1.7.11 que dejan una decisión pendiente (reemisión):**
1. **Pedir un segundo enlace no invalida el anterior:** los dos valen hasta usarse o vencer. No hay soporte nativo para invalidarlo.
2. **Los enlaces pendientes sobreviven al restablecimiento:** usar uno no invalida los otros que aún no se usaron; siguen sirviendo hasta que vencen (1 hora). Un test de caracterización lo documenta.
3. **Vencimiento exacto:** la librería compara «vence antes que ahora»; en el milisegundo exacto de la hora el enlace todavía vale. Es una diferencia de 1 ms con «vencido al alcanzar la hora».

Las opciones son dejarlo así o invalidar los enlaces anteriores con una limpieza propia, pequeña pero atada al formato interno de la librería (el diseño pide no crear infraestructura compleja). Se decide antes de cerrar la recuperación.

**Pruebas:** correo (`correo.test.ts`, `correo-recuperacion.test.ts`), orquestación (`recuperar-contrasena.test.ts`), formularios, integración contra el handler real y PostgreSQL con un proveedor de correo de reemplazo (`recuperacion.integracion.test.ts`: neutralidad, tiempo, fallo del proveedor, origen, un solo uso, vencimiento con reloj simulado, concurrencia, rollback, reemisión) y E2E con enlaces reales sin enviar correos (`e2e/recuperacion.spec.ts`).

### Protocolo de migraciones

Para evitar migraciones incompatibles entre owners (ADR-003; blueprint, secciones 3 y 12). Drizzle Kit, directorio `drizzle/` (SQL y `meta/`), que se versiona.

1. **Cada owner edita solo su schema** en `lib/infraestructura/esquemas/<modulo>.ts`. Cambios a archivos compartidos (configuración de Drizzle, arnés, `package.json` y lock) se avisan antes. **Esa carpeta solo puede contener schemas**: Drizzle Kit carga todo `.ts` que haya ahí, y un test o un helper (que importe Vitest, por ejemplo) hace fallar `pnpm db:generate`. Los tests de un schema van fuera de la carpeta, junto a `lib/infraestructura/` (un test lo verifica).
2. **Una migración a la vez.** Antes de `pnpm db:generate`, integrar `main` reciente y verificar que nadie tenga una migración sin integrar; si la tiene, esperar a que entre. Avisar al equipo al generar. Usar un nombre descriptivo: `pnpm db:generate --name auth-base`.
3. **Revisar el SQL generado** antes de integrarlo (cuidado con `DROP`, cambios de tipo y de restricciones). Los nombres de tablas y columnas de Better Auth se conservan como los genera la librería.
4. **Una migración ya integrada a `main` nunca se edita ni se regenera**: un cambio posterior es una migración nueva. Las migraciones se aplican con `pnpm db:migrate` (sobre `DATABASE_URL`); las pruebas de integración las aplican a la base `_test`.
5. **Conflictos en `drizzle/meta/_journal.json` o en los snapshots al integrar `main`:** no se mezclan a mano. Si tu migración todavía no entró a `main`, descartarla (borrar su `.sql` y su snapshot y restaurar el journal de `main`), traer `main` y regenerarla. Antes de integrar, correr `pnpm db:check`, que detecta inconsistencias del historial, y `pnpm db:generate`: si no cambiaste ningún schema debe responder «No schema changes, nothing to migrate» (si genera una migración que no esperabas, algo cambió; revisarla antes de seguir) (mientras no exista ninguna migración, crea un `drizzle/meta/_journal.json` vacío: no commitearlo; el journal nace con la primera migración real).
6. **Orden de dependencias:** el schema de Auth entra primero, porque las tablas de Inventario, Compras y Ventas referencian a la usuaria (`actorId`). Las columnas o FK de origen de `CompraLinea` y `VentaLinea` llegan junto con su tabla. Nadie importa schemas que todavía no existen.
7. **Sin migraciones automáticas** en `build` ni en el arranque, y sin datos de demostración en producción. El procedimiento de migración en producción sigue pendiente (hosting y base administrada sin decidir).
