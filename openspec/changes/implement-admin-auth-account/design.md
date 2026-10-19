# Design

## Context

Ver proposal y blueprint secciones 3–9/12. Login actual hace `router.push`; admin no está protegido. Stack elegido y no instalado. ADR-004 gobierna auth/correo, ADR-003 transacciones y ADR-006 arnés.

## Goals / Non-Goals

Entregar frontera real de identidad y cuenta única; no negocio, roles, tema o registro público. La infraestructura compartida es mínima para auth y coordinación, no un CRUD genérico.

## Decisions

- Emi posee `lib/infraestructura/db.ts`, configuración Drizzle y schema de auth generado/inspeccionado por versión; referencias auth inglesas preservadas. `pg` con pool y adaptador transaccional. No instalar ORM alternativo.
- Mejorar formulario existente con email/contraseña; Handler `/api/auth/[...all]`, integración oficial de cookies. Auditar/deshabilitar endpoints de registro y edición/eliminación de perfil no aprobados: esconder botones no basta. Provisión aislada por script con lock, rechazo de cuenta existente y secreto por entrada segura; excepción de signup solo en ese proceso.
- `exigirAdministradora` valida sesión desde headers junto a cada lectura/Action/Handler privado; shell guard y redirección desde login autenticado mejoran UX. Proxy opcional no es frontera única.
- Sesión en BD, 30 días, sin refresh indefinido ni cookieCache para revocación inmediata. Cookies/origen y límites sensibles según ADR/SEGURIDAD.
- Better Auth genera/consume reset; Resend entrega URL confiable. TTL 15 minutos, respuesta neutra, `revokeSessionsOnPasswordReset`, adaptador con transacciones y nuevo login. Simular proveedor de correo en tests; no correos reales de prueba.
- `/admin/cuenta` muestra nombre/email y flujo de contraseña actual/nueva; no edición de email/nombre. Resolver política de otras sesiones con responsable antes de cerrar ese recorrido; el resto puede integrarse primero.

## Risks / Trade-offs

- Cambios del schema/API de auth → fijar versión compatible y revisar generación, sin copiar beta; migraciones en serie.
- Un SDK de correo abandonado tras responder puede perder entrega → usar mecanismo de vida garantizada y logs redactados del runtime, manteniendo respuesta neutra.
- Cuota/correo/secretos/dominio faltantes → dobles en tests y pendiente operativo, no credenciales en Git.
- Pendiente de sesiones al cambiar contraseña → bloquea esa aceptación, no inventar política ni bloquear login/reset por completo.

## Migration Plan

Implementación futura: E0 DB/arnés + auth schema → provisión segura en entorno de prueba → login/guard/logout → reset/Cuenta. Schema versionado, sin migración automática al build ni datos de demo en producción. Rollback de aplicación según compatibilidad; no eliminar credenciales/historial para volver a mocks.

## Open Questions

Producto: otras sesiones tras cambio autenticado y edición de email; esta última no se implementa sin aprobación. Operación: dominio/remitente Resend, secretos y mecanismo de soporte seguro. Fuentes académicas: pendientes del registro de trazabilidad. No quedan abiertas elección de ORM/auth/email/testing.
