# ADR-004: Better Auth y Resend para cuenta y recuperación

**Estado: ACEPTADO — 19/10/2026.** Herramientas aprobadas expresamente; controles técnicos bajo autorización de arquitectura. No implementadas.

## Contexto y alternativas

Una sola administradora, email/contraseña, persistencia hasta 30 días y recuperación con revocación global. Auth propia, login social y mecanismos alternativos no satisfacen el alcance aprobado. Se compararon sesiones persistidas frente a tokens stateless y correo integrado al dominio frente a adaptador de entrega.

## Decisión

Better Auth gobierna credenciales, hashing, sesiones y reset con adaptador Drizzle/PostgreSQL (`transaction: true` para consumo/reset/revocación atómicos, verificar en la versión fijada). Resend entrega el mensaje mediante `sendResetPassword`; no genera ni valida tokens. No duplicar esquema de auth ni crear criptografía propia.

Sesiones en BD; expiración de 30 días, refresh deshabilitado para no extender indefinidamente el plazo; cookie de sesión administrada por Better Auth. `HttpOnly`, Secure con HTTPS, SameSite Lax y origen confiable explícito. Sin cache secundaria/cookieCache que pueda demorar revocación, sin tokens manuales en localStorage. Comprobar sesión con headers de la solicitud junto a cada consulta/mutación; proxy/redirección y layout no sustituyen esa comprobación.

`disableSignUp` en la configuración publicada; sin OAuth, magic links, SMS, roles ni 2FA. Provisión por script local/deploy controlado, nunca endpoint `/register`: usa API servidor de Better Auth, credenciales por entrada segura/entorno no versionado, lock exclusivo de provisión y rechazo si ya existe la cuenta. La excepción de alta existe solo dentro del proceso de setup, no se habilita temporalmente en el servidor público. Registrar únicamente resultado, no contraseña; no crear la cuenta al importar módulos ni al compilar.

Reset: respuesta neutra, enlace de 15 minutos y un uso; Better Auth controla consumo. `revokeSessionsOnPasswordReset: true`, sin login automático. Resend se programa desde el callback con `after` de Next en contexto de la petición, garantizando su ejecución posterior a la respuesta dentro de la vida soportada del runtime, sin promesa abandonada ni respuesta diferente por existencia de email; probar ese ciclo con el hosting elegido y redactar fallos. Remitente/dominio verificados y secretos siguen pendientes de operación, no se envía correo en esta tarea.

Cuenta en `/admin/cuenta`: muestra nombre/email y cambia contraseña verificando la actual. Edición de email/nombre no se habilita por inferencia. **La política de otras sesiones tras cambio autenticado sigue pendiente de decisión de producto**: no extrapolar revocación global de recuperación. Bloquea únicamente cerrar ese recorrido, no login/reset. La preferencia visual pertenece a Configuración, fuera de este slice.

## Consecuencias

Revisar esquema generado por la versión de Better Auth elegida antes de escribir migraciones: User, Session, Account y Verification son convenciones del framework. Sin requisitos nuevos por columnas opcionales de la librería. Rate limiting persistente para endpoints sensibles usando soporte de Better Auth/BD; límites y aceptación se documentan en la implementación. No bypass de CSRF/origin ni logout mediante GET. Pruebas de reset concurrente y rollback son condición de cierre.

## Fuentes

[Next.js con Better Auth](https://better-auth.com/docs/integrations/next), [sesiones](https://better-auth.com/docs/concepts/session-management), [email/contraseña](https://better-auth.com/docs/authentication/email-password), [Resend/Node](https://resend.com/docs/send-with-nodejs). Consultadas el 19/10/2026; contrastar APIs y versión al implementar.
