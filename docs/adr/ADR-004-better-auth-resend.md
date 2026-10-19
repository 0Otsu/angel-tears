# ADR-004: Better Auth y Resend para cuenta y recuperación

**Estado: ACEPTADO — 19/10/2026.** Herramientas aprobadas expresamente; controles técnicos bajo autorización de arquitectura. No implementadas.

## Contexto y alternativas

Una sola administradora, email/contraseña, sesión con máximo absoluto de 30 días desde login y recuperación de 1 hora con revocación global. Políticas finales aprobadas por responsable, [producto, sección 9](../DECISIONES_PRODUCTO_MVP.md#9-cierre-final-de-auth-y-cuenta--19102026), pendientes de formalización SRS/RUP. Auth propia, login social y mecanismos alternativos no satisfacen el alcance aprobado. Se compararon sesiones persistidas frente a tokens stateless y correo integrado al dominio frente a adaptador de entrega.

## Decisión

Better Auth gobierna credenciales, hashing, sesiones y reset con adaptador Drizzle/PostgreSQL (`transaction: true` para consumo/reset/revocación atómicos, verificar en la versión fijada). Resend entrega el mensaje mediante `sendResetPassword`; no genera ni valida tokens. No duplicar esquema de auth ni crear criptografía propia.

Sesiones en BD; máximo absoluto de 30 días desde login: la actividad diaria no lo renueva ni lo extiende. Al vencer se exige nuevo login. Verificar y probar cómo representar esa política con las opciones de la versión fijada de Better Auth, sin afirmar que un ajuste aislado garantiza el resultado ni configurar ahora. Cookie de sesión administrada por Better Auth: `HttpOnly`, Secure con HTTPS, SameSite Lax y origen confiable explícito. Sin cache secundaria/cookieCache que pueda demorar revocación, sin tokens manuales en localStorage. Comprobar sesión con headers de la solicitud junto a cada consulta/mutación; proxy/redirección y layout no sustituyen esa comprobación.

`disableSignUp` en la configuración publicada; sin OAuth, magic links, SMS, roles ni 2FA. Provisión por script local/deploy controlado, nunca endpoint `/register`: usa API servidor de Better Auth, credenciales por entrada segura/entorno no versionado, nunca contraseña en argumentos CLI. Lock exclusivo de provisión y rechazo si ya existe la cuenta: reintento idempotente/seguro, sin segunda administradora ni modificación de credenciales existentes, incluso concurrente. La excepción de alta existe solo dentro del proceso de setup, no se habilita temporalmente en el servidor público. No imprimir ni registrar contraseña; documentar procedimiento, entradas seguras, resultado y reintento. No crear la cuenta al importar módulos ni al compilar.

Reset: respuesta neutra, enlace de **1 hora** y un uso; Better Auth controla consumo. `revokeSessionsOnPasswordReset: true`, invalidar enlace y todas las sesiones previas, sin login automático y con vuelta a login. Resend se programa desde el callback con `after` de Next en contexto de la petición, garantizando su ejecución posterior a la respuesta dentro de la vida soportada del runtime, sin promesa abandonada ni respuesta diferente por existencia de email, **incluso ante fallo interno de entrega**; probar ese ciclo con el hosting elegido y redactar fallos. Remitente/dominio verificados y secretos siguen pendientes de operación, no se envía correo en esta tarea.

Nueva contraseña rechazada por la política antes de completar reset: el enlace no debe consumirse **si la versión fijada de Better Auth lo soporta**. Comprobar con prueba de integración y documentar evidencia; no es una garantía de librería verificada por este ADR. Si no se soporta, registrar limitación y resolver antes de cerrar ese criterio.

Reemisión pendiente: ¿qué ocurre con el primer enlace al solicitar un segundo antes del vencimiento? Preferir invalidar el anterior si Better Auth ofrece soporte nativo maduro; si no, no construir infraestructura propia compleja. Documentar comportamiento real de la versión elegida y decidir antes de cerrar recuperación.

Cuenta en `/admin/cuenta`: muestra nombre/email de solo lectura, cambia contraseña verificando la actual y ofrece logout. Sin edición de email/nombre, roles o perfil complejo. **La política de otras sesiones tras cambio autenticado sigue pendiente de decisión de producto**: no extrapolar revocación global de recuperación. Es el único bloqueo de ese subflujo, no de todo Auth/login/reset. `/admin/configuracion` contiene únicamente tema claro/oscuro persistente de admin; nunca cambia Home/catálogo/PDP/identidad pública y queda fuera de este slice.

## Consecuencias

Revisar esquema generado por la versión de Better Auth elegida antes de escribir migraciones: User, Session, Account y Verification son convenciones del framework. Sin requisitos nuevos por columnas opcionales de la librería. Rate limiting persistente para endpoints sensibles usando soporte de Better Auth/BD, sin bloqueo indefinido de la única administradora; número exacto de intentos y tiempos se concretan al implementar/operar, no se inventan aquí. No bypass de CSRF/origin ni logout mediante GET. Pruebas de reset concurrente y rollback son condición de cierre. Aplicar [matriz de errores Auth](../../openspec/changes/implement-admin-auth-account/design.md#matriz-de-errores-y-conservación-segura): sin SQL, stacks, contraseñas, tokens, URLs de recovery ni secretos en mensajes de error o logs.

## Fuentes

[Next.js con Better Auth](https://better-auth.com/docs/integrations/next), [sesiones](https://better-auth.com/docs/concepts/session-management), [email/contraseña](https://better-auth.com/docs/authentication/email-password), [Resend/Node](https://resend.com/docs/send-with-nodejs). Consultadas el 19/10/2026; contrastar APIs y versión al implementar.
