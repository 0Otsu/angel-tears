# Design

## Context

Ver proposal y blueprint secciones 3–9/12. Login actual hace `router.push`; admin no está protegido. Stack elegido y no instalado. ADR-004 gobierna auth/correo, ADR-003 transacciones y ADR-006 arnés. El cierre final de producto, sección 9, aprueba sesión absoluta de 30 días y recovery de 1 hora; formalización SRS/RUP pendiente. Este es el único change Auth vigente de Emi: rescate selectivo de `docs/auth-stack-ebenitez` (`027e8a9`), discontinuada como candidata de integración, sin merge/cherry-pick ni spec paralela; procedencia en [OPENSPEC](../../../docs/OPENSPEC.md).

## Goals / Non-Goals

Entregar frontera real de identidad y cuenta única; no negocio, roles, tema o registro público. La infraestructura compartida es mínima para auth y coordinación, no un CRUD genérico.

## Decisions

- Emi posee `lib/infraestructura/db.ts`, configuración Drizzle y schema de auth generado/inspeccionado por versión; referencias auth inglesas preservadas. `pg` con pool y adaptador transaccional. No instalar ORM alternativo.
- Mejorar formulario existente con email/contraseña; Handler `/api/auth/[...all]`, integración oficial de cookies. Auditar/deshabilitar endpoints de registro y edición/eliminación de perfil no aprobados: esconder botones no basta. Provisión aislada por script con lock y secreto por entrada segura/entorno no versionado, nunca contraseña en argumentos CLI ni salida/logs; excepción de signup solo en ese proceso. Setup idempotente/seguro: si ya existe cuenta, rechazar segunda creación sin cambiar credenciales, también ante concurrencia; documentar procedimiento seguro y reintento.
- `exigirAdministradora` valida sesión desde headers junto a cada lectura/Action/Handler privado; shell guard y redirección desde login autenticado mejoran UX. Proxy opcional no es frontera única.
- Sesión en BD con máximo absoluto de 30 días desde login: el uso diario no extiende el máximo y al vencer exige nuevo login. Verificar opciones y comportamiento de la versión fijada de Better Auth, sin configurar ahora. Sin cookieCache para revocación inmediata; cookies/origen según ADR/SEGURIDAD.
- Better Auth genera/consume reset; Resend entrega URL confiable. TTL **1 hora**, respuesta pública neutra incluso si falla internamente el envío, `revokeSessionsOnPasswordReset`, consumo/enlace/contraseña/revocación global atómicos y vuelta a login sin auto-login. Simular proveedor de correo en tests; no correos reales de prueba.
- Nueva contraseña rechazada por política antes de completar reset: enlace sin consumir **si la versión fijada lo soporta**. Verificar con integración, registrar evidencia y resolver limitación si existe antes de cerrar ese criterio; no declarar garantía de librería sin comprobación.
- Reemisión: preferir invalidar el enlace anterior al solicitar un segundo si existe soporte nativo maduro de Better Auth. Verificar/documentar comportamiento real y decidir antes de cerrar recuperación; no crear infraestructura propia compleja si no lo soporta. Puede permanecer pendiente hasta implementación.
- Endpoints sensibles con rate limiting persistente según ADR-004, sin bloqueo indefinido de la única administradora. Intentos exactos y tiempos/ventanas se concretan al implementar/operar; no son valores de producto aprobados ni se inventan aquí.
- `/admin/cuenta` muestra nombre/email de solo lectura, flujo de contraseña actual/nueva y acceso a logout; sin edición de identidad/roles/perfil complejo. Política de otras sesiones pendiente: único bloqueo de ese subflujo, sin extrapolar reset ni bloquear todo Auth. `/admin/configuracion` solo tema claro/oscuro persistente de `/admin/*`, R3 fuera de Auth; no cambia Home/catálogo/PDP ni identidad pública.
- Testing en PostgreSQL aislado con guard de entorno y correo fake, sin servicios/datos productivos. Verificar entorno DOM si RTL lo requiere e instalar/documentar browsers Playwright durante implementación del arnés, no en esta corrección.

### Matriz de errores y conservación segura

Los mensajes son ejemplos de intención, no copy rígido. Nunca incluir SQL, stack traces, contraseñas, tokens, URLs de recovery ni secretos en errores/respuestas o logs; solo diagnóstico redactado/correlación segura. El enlace se entrega exclusivamente por el flujo de correo autorizado, no como diagnóstico. Conservar únicamente campos no sensibles en memoria de formulario cuando sea seguro; limpiar contraseñas y no persistir formularios en almacenamiento cliente ni reintentar mutaciones automáticamente tras perder sesión.

| Situación | Qué ve la usuaria / resultado | Datos seguros que pueden conservarse |
| --- | --- | --- |
| Email o contraseña incorrectos | Error neutro de credenciales; no revela existencia de email ni crea sesión. | Email ingresado; limpiar contraseña. |
| Sesión vencida al enviar | Solicitar nuevo login; rechazar operación sin efectos ni duplicados y revalidar al reenviar explícitamente. | Campos no sensibles en memoria si es seguro; limpiar contraseñas. |
| Token inválido | Enlace no válido; permitir solicitar otro, sin cambio de credencial ni sesión. | Email si ya fue ingresado; sin reflejar token/URL en mensaje o diagnóstico. |
| Token vencido | Enlace vencido; solicitar otro, sin completar reset. | Igual que token inválido; limpiar contraseñas. |
| Token ya utilizado | Enlace ya no válido; solicitar otro, sin repetir reset ni crear sesión. | Igual que token inválido; limpiar contraseñas. |
| Nueva contraseña rechazada antes del reset | Error de política aplicable; sin cambiar credencial. Verificar que no consume el enlace si Better Auth lo soporta en la versión fijada. | Ninguna contraseña; el mecanismo nativo retiene el contexto del enlace si está soportado, sin exponerlo en errores/logs. |
| Contraseña actual incorrecta | Error de campo en Cuenta; credencial sin cambios. No inferir efectos sobre otras sesiones. | No hay campos de contraseña que conservar; nombre/email siguen solo lectura. |
| Base de datos no disponible | Error técnico recuperable, sin SQL/stack ni éxito falso. En solicitud de recuperación mantener respuesta pública neutra. | Email o campos no sensibles según formulario; limpiar contraseñas. |
| Proveedor de correo falla | Misma confirmación neutra de solicitud de recuperación para cualquier email, aun si falla entrega; diagnóstico interno redactado. | Email ingresado; nunca token, URL ni detalle del proveedor en la respuesta pública. |
| Intento de signup público | Rechazo sin crear cuenta ni habilitar registro, aunque se llame directamente el endpoint. | Ninguno; no almacenar payload ni contraseña del intento. |
| Demasiados intentos | Respuesta limitada y orientación de reintento segura, sin existencia de email ni bloqueo indefinido. Recuperación conserva neutralidad respecto de identidad/entrega. | Email si corresponde; limpiar contraseñas. Valores exactos pendientes. |

## Risks / Trade-offs

- Cambios del schema/API de auth → fijar versión compatible y revisar generación, sin copiar beta; migraciones en serie.
- Un SDK de correo abandonado tras responder puede perder entrega → usar mecanismo de vida garantizada y logs redactados del runtime, manteniendo respuesta neutra.
- Cuota/correo/secretos/dominio faltantes → dobles en tests y pendiente operativo, no credenciales en Git.
- Pendiente de sesiones al cambiar contraseña → bloquea esa aceptación, no inventar política ni bloquear login/reset por completo.

## Migration Plan

Implementación futura: E0 DB/arnés + auth schema → provisión segura en entorno de prueba → login/guard/logout → reset/Cuenta. Schema versionado, sin migración automática al build ni datos de demo en producción. Rollback de aplicación según compatibilidad; no eliminar credenciales/historial para volver a mocks.

## Evidencia de cierre — 26/10/2026

Sobre `main` en `92a6a24` (Better Auth 1.7.11, Resend 6.34.1, Drizzle 0.45.4, PostgreSQL 18): `pnpm lint` (sin advertencias), `pnpm typecheck`, `pnpm build`, `pnpm db:check`, `pnpm test` (225 pruebas/28 archivos), `pnpm test:integration` (105 pruebas/10 archivos, contra la base de pruebas aislada) y `pnpm test:e2e` (32 pruebas en Chromium: acceso, Cuenta, protección directa del panel y recuperación) aprobados; `openspec validate --all --strict` y `git diff --check` limpios. Los tests y los E2E no usan Resend: reemplazan el proveedor y no envían correos. Procedimiento, opciones de la librería y limitaciones: [DESARROLLO](../../../docs/DESARROLLO.md).

Decisiones y límites de librería comprobados con pruebas de caracterización (avisan si una versión futura cambia el comportamiento):

- `changePassword({ revokeOtherSessions: true })` reemplaza la sesión actual y le reinicia los 30 días; la política aprobada (conservar la actual sin extender, cerrar las demás) se implementa con `changePassword` más `/revoke-other-sessions`, en dos pasos no atómicos con reintento en pantalla.
- Reemisión de recuperación (decisión del 24/10/2026): un pedido nuevo no invalida el enlace anterior y los pendientes sobreviven a un restablecimiento. Se dejó así para no crear infraestructura propia atada a la librería; riesgo acotado (1 hora, un solo uso, una sola cuenta).
- El enlace vence en la comparación estricta de la librería: en el milisegundo exacto de la hora todavía vale.
- Origen y CSRF se fijan explícitamente porque Better Auth los apaga con `NODE_ENV=test`; el envío del correo va después de responder (`after`) para que el tiempo no delate si la cuenta existe.

RF/CU todavía provisionales (sin IDs nuevos; formalización SRS/RUP pendiente): RF-01 (iniciar sesión) y RF-02 (cerrar sesión) son referencias humanas de la trazabilidad; recuperación por correo, cambio autenticado de contraseña, máximo absoluto de sesión de 30 días e invalidación de sesiones son decisiones de producto aprobadas por el responsable (DECISIONES_PRODUCTO_MVP, secciones 9 y 10) sin número de requisito ni caso de uso.

Sigue pendiente de operación y hosting, sin valores inventados: clave de API y dominio remitente verificado en Resend (y su cuota frente a la ventana de 3 pedidos por minuto), proxy de confianza para el límite de intentos por IP (hoy se evade rotando `x-forwarded-for` si el servidor se expone sin proxy), alta de la administradora en producción, base de producción y política de complejidad de contraseña (hoy solo largo de 8 a 128).

## Open Questions

Producto: otras sesiones tras cambio autenticado, único bloqueo de ese subflujo. Reemisión de recovery: verificar soporte nativo/versionado y decidir antes de cerrar el flujo, sin infraestructura propia compleja. Nombre/email son solo lectura, su edición no está autorizada. Operación: dominio/remitente Resend, secretos, soporte seguro y valores técnicos de rate limiting. Comprobaciones de librería: representación del máximo absoluto/TTL y enlace no consumido ante rechazo de contraseña, con evidencia. Fuentes académicas: pendientes del registro de trazabilidad. No quedan abiertas elección de ORM/auth/email/testing ni sesión/TTL como decisión de producto.

## Workflow

Rama propia desde main actualizado, ownership de Emi y coordinación de compartidos intactos; sincronizar e integrar main reciente de forma segura, resolver conflictos entendidos y revisar diff. Tests aplicables/lint/typecheck/build/OpenSpec correctos antes de merge, push y aviso al equipo. PR/aprobación cruzada no son gates; otra revisión es recomendable. No ejecutar tasks ni archivar durante esta corrección documental.
