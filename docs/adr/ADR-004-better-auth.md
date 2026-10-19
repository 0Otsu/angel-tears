# ADR-004: Better Auth para autenticación y sesiones

**Estado: ACEPTADO**

Aceptación humana explícita: 19/10/2026, indicada por el equipo del proyecto (decisión del responsable). Un agente no acepta ADR por su cuenta: esta aceptación proviene de esa indicación humana. La revisión del PR que incorpora este ADR sigue pendiente.

Este ADR elige la herramienta y registra cómo encajan las decisiones de producto ya aprobadas. **No cambia ninguna decisión de producto** (secciones I, J y K de [DECISIONES_PRODUCTO_MVP](../DECISIONES_PRODUCTO_MVP.md)) ni modifica la SRS/RUP.

## Contexto

Hoy la administración no está protegida: el login es una navegación mock, `/admin` se abre por URL directa y "Cerrar sesión" es un enlace ([MAPA_IMPLEMENTACION](../MAPA_IMPLEMENTACION.md), sección 3). [SEGURIDAD.md](../SEGURIDAD.md) exige una solución madura (no criptografía propia), contraseñas nunca en texto plano, autorización siempre en servidor y cookies seguras.

Lo que el producto necesita, ya aprobado:

- una sola Administradora, sin registro público, sin multiadministrador ni roles (I1, I5, I6);
- acceso con email único y contraseña; el teléfono comercial no es identidad (I2, I3);
- sesión persistente de hasta 30 días en dispositivo propio, con cierre manual y nueva autenticación al expirar (I4);
- recuperación únicamente por email: respuesta neutra, enlace temporal de un solo uso, nueva contraseña, invalidación del enlace, invalidación de **todas** las sesiones anteriores y nuevo login (J1–J4);
- en Configuración: mostrar nombre y email, y cambiar la contraseña estando autenticada; sin editar email en este slice (K1).

## Alternativas

La elección la tomó el responsable del proyecto. Esta documentación no evaluó alternativas en detalle; solo recuerda que:

- una implementación propia queda descartada por [SEGURIDAD.md](../SEGURIDAD.md);
- otras opciones habituales son Auth.js o un proveedor de identidad gestionado.

## Decisión

Usar **Better Auth** con autenticación por email y contraseña, sesiones respaldadas en PostgreSQL mediante el adaptador de Drizzle ([ADR-003](ADR-003-drizzle-orm.md)), integrado a Next.js full-stack.

### Cómo se cubren los requisitos (conceptual)

Los nombres de opciones corresponden a la documentación de Better Auth consultada el 19/10/2026 (versión 1.7.11). Se vuelven a confirmar al implementar.

| Necesidad | Enfoque con Better Auth |
| --- | --- |
| Login | Email + contraseña. La librería verifica el hash; la aplicación no almacena ni compara contraseñas. Mensaje de error neutro ante credenciales inválidas. |
| Sin registro público | `emailAndPassword.disableSignUp: true` y ninguna página `/register`. Debe existir una prueba que verifique que el endpoint de alta no crea cuentas. |
| Sesión | Sesión en la base de datos (comportamiento por defecto sin almacenamiento secundario), identificada por una cookie. La revocación es inmediata porque el servidor consulta la sesión. |
| Duración | `session.expiresIn` pasa de 7 días (valor por defecto) a 30 días (2.592.000 s). Ver pendientes sobre renovación. |
| Cookie | Gestionada por la librería. Según su documentación, las cookies son seguras en producción por defecto. `HttpOnly`, `SameSite` y ámbito se verifican al implementar. **No se guarda ningún token ni JWT en `localStorage`.** |
| Logout | Cierre manual que invalida la sesión en servidor y elimina la cookie; después redirige a `/admin/login`. |
| Protección server-side | Ver sección siguiente. |
| Recuperación | Flujo de restablecimiento de Better Auth con `sendResetPassword`. Respuesta neutra exista o no el email. |
| Vigencia del enlace | `emailAndPassword.resetPasswordTokenExpiresIn`, 3600 s por defecto. **La duración exacta sigue pendiente de decisión** (ver abajo). |
| Reset | La nueva contraseña se valida antes de consumir el token; un rechazo por política de contraseña no gasta el enlace. El token usado debe quedar inválido (se prueba). |
| Revocación tras reset (J3) | `emailAndPassword.revokeSessionsOnPasswordReset: true` (por defecto es `false`; hay que activarlo). Tras el reset no se inicia sesión automáticamente. |
| Cambio autenticado | Endpoint de cambio de contraseña, que exige sesión y contraseña actual, con opción `revokeOtherSessions`. Qué hacer con las demás sesiones **sigue pendiente** (K1). |
| Límite de intentos | Limitador de la librería: activo en producción y desactivado en desarrollo por defecto. Reglas más estrictas para login y reset. Ver consecuencias. |

### Protección server-side

La autorización se verifica en el servidor, no en la interfaz:

- Las páginas y datos privados validan la sesión con la API de servidor de Better Auth (`auth.api.getSession` con los headers de la petición) y redirigen a `/admin/login` si no hay sesión válida.
- Una verificación en `app/admin/(panel)/layout.tsx` sola **no basta**: los layouts no se vuelven a ejecutar en cada navegación. La comprobación debe hacerse también en cada página y en cada lectura o comando privado (Server Actions, Route Handlers).
- Next.js 16 renombró `middleware` a `proxy` (`proxy.ts`). Un proxy puede ayudar a redirigir de forma optimista, pero solo mirar la existencia de la cookie **no valida** la sesión. No sustituye la validación junto a los datos.
- Un usuario autenticado que visite `/admin/login` es redirigido a `/admin`.
- Ocultar el enlace de administración no es una medida de seguridad ([SEGURIDAD.md](../SEGURIDAD.md)).
- Las respuestas privadas no se guardan en caché pública compartida.

### Rutas

Better Auth monta su API en `app/api/auth/[...all]/route.ts`. Las pantallas se mantienen bajo `/admin`:

- `/admin/login` (existente, se adapta);
- `/admin/recuperar`;
- una página de restablecimiento. El mapa propuso `/admin/restablecer/[token]`, pero Better Auth redirige con el token como parámetro de consulta. La variante concreta (`/admin/restablecer?token=...` u otra) se confirma al implementar y se documenta cualquier diferencia;
- `/admin` y `/admin/configuracion` (existentes, se protegen).

No se crean rutas redundantes si la librería ya resuelve la función.

## Decisión específica: cuenta administradora inicial

**No habrá `/register` público.** La primera cuenta no se crea desde ninguna página de la aplicación.

Opciones evaluadas técnicamente:

| Opción | Evaluación |
| --- | --- |
| Seed dentro de las migraciones | Descartada. Acopla credenciales a un mecanismo que se ejecuta automáticamente en cada entorno y que se versiona; la contraseña inicial terminaría en el repositorio o en variables de una migración. |
| **Script de setup de ejecución manual** | **Recomendada.** Se ejecuta una vez por entorno, de forma deliberada. |
| Inserción manual en la base de datos | Descartada. Obliga a generar el hash a mano, es propensa a errores y no es reproducible. |

Requisitos del script recomendado (a implementar en `feature/auth`, **no en esta etapa**):

- Pide email, nombre y contraseña por entrada interactiva o variables de entorno; **no** por argumentos de línea de comandos que queden en el historial del terminal.
- Usa el mecanismo de hash de la librería; nunca guarda texto plano.
- Se niega a crear una segunda cuenta si ya existe una administradora (una sola Administradora en el MVP). Debe ser seguro ejecutarlo dos veces.
- No imprime ni registra la contraseña.
- Valida las entradas con Zod ([ADR-005](ADR-005-zod-validacion.md)).
- Queda documentado en `DESARROLLO.md` cuando se implemente.
- Con el registro público deshabilitado, hay que confirmar al implementar si el script puede usar la API de servidor de la librería o si debe usar su contexto interno para crear usuario y credencial.

Pendiente fuera de este ADR: provisión en el entorno productivo (depende del hosting y de la base, aún sin decidir) y procedimiento de soporte seguro si se pierde el acceso al email.

## Resend: proveedor de email transaccional

**Resend** es el proveedor de envío de email transaccional usado **para la recuperación de contraseña**. No tiene un ADR propio.

- Better Auth gobierna el flujo de autenticación y de restablecimiento. Resend solo entrega el correo.
- Better Auth recomienda no esperar (`await`) al envío dentro de `sendResetPassword`, para evitar diferencias de tiempo que revelen si el email existe. El diseño debe cumplir la respuesta neutra de J2.
- **No se usa** para marketing, newsletters, pedidos ni notificaciones adicionales. Ampliar su uso requiere una decisión nueva.
- La clave de API es un secreto de entorno; nunca se versiona ni se registra.
- Resend necesita un dominio remitente verificado para producción. Dominio y hosting siguen sin decidirse. En desarrollo y pruebas, el envío se reemplaza por un doble controlado.
- Si el envío falla, se registra de forma protegida (sin token ni URL de restablecimiento) y la respuesta pública sigue siendo neutra.

## Razones

- Cumple [SEGURIDAD.md](../SEGURIDAD.md): solución madura, sin criptografía propia, contraseñas con hash.
- Cubre las capacidades que necesita el producto: sesión persistente con revocación, restablecimiento con token temporal, revocación de todas las sesiones tras el reset y registro deshabilitable.
- Compatible con el stack: sus dependencias de par declaran `next ^16`, `react ^19` y `drizzle-orm ^0.45.2` (verificado en npm el 19/10/2026).
- Sesiones en base de datos permiten cerrarlas del lado del servidor, algo que una cookie con datos firmados no garantiza.

## Consecuencias

- Nueva dependencia (`better-auth`) y tablas de autenticación en PostgreSQL, generadas con la herramienta de Better Auth y gestionadas con drizzle-kit. En este slice solo se crean las tablas que la autenticación necesita; **no** se crean tablas del dominio comercial.
- Secretos y configuración por variables de entorno: secreto de la librería, URL base, conexión a la base y clave de Resend. Los nombres exactos se confirman al implementar y se documentan en un `.env.example` sin valores reales. No se versiona ningún `.env`.
- Mantener desactivada la caché de sesión en cookie: con ella, una sesión revocada seguiría siendo aceptada hasta que venza esa caché, lo que contradice la invalidación inmediata exigida por J3. Si se quiere activar, hace falta una decisión explícita.
- **Límite de intentos:** el limitador integrado guarda sus datos en memoria por defecto, lo que no es fiable si hay varias instancias o un entorno serverless. Hay que elegir dónde guardarlos (por ejemplo la base de datos) cuando se conozca el hosting. La documentación consultada fija una regla estricta para el login por email pero no menciona una para el restablecimiento; habrá que definirla.
- No implementar: SMS, OAuth, magic links, 2FA, preguntas secretas, verificación de email, edición de email ni roles.
- Los errores no muestran secretos ni trazas; los registros nunca incluyen contraseñas ni tokens.
- La UI mock existente se adapta conservando su diseño. Ya incluye etiquetas y estructura accesibles, pero el campo "Correo o usuario" pasará a ser de email y se retirará el texto "sin autenticación".

### Pendientes que este ADR no resuelve

Estos puntos figuran como pendientes en las decisiones de producto y no se deciden aquí:

1. **Renovación de la sesión:** si "hasta 30 días" es un plazo absoluto desde el login o una ventana que se renueva con el uso. Por defecto Better Auth renueva la expiración cuando se usa la sesión pasado `updateAge` (1 día).
2. **Duración exacta del enlace de recuperación** y política de reemisión (un enlace nuevo, ¿invalida el anterior?). Valor candidato: el de la librería, 3600 s; a validar.
3. **Sesiones al cambiar la contraseña estando autenticada** (K1). J3 solo cubre la recuperación.
4. **Edición de email:** fuera de este slice.
5. Provisión en producción y soporte seguro ante pérdida de acceso.
6. Hosting, proveedor final de PostgreSQL, dominio remitente de Resend y almacenamiento del limitador de intentos.

Cambiar esta decisión requiere un ADR que la reemplace.
