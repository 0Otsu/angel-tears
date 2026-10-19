# Proposal

## Why

El acceso administrativo actual solo navega sobre mocks y no puede proteger datos reales. Emi implementará el slice de identidad/cuenta de Ronda 1 conforme a decisiones I/J y actualizaciones 8/9, sin ejecutar trabajo comercial. Es el change vigente desde main; la rama histórica `docs/auth-stack-ebenitez` queda discontinuada como candidata de integración tras rescate selectivo, sin spec paralela.

## What Changes

- Owner: **Emi**. Ronda: **1**. Estado: planificación; ninguna task ejecutada.
- Base Drizzle compartida necesaria para auth, schema de Better Auth y provisión inicial controlada.
- Login/logout, sesión de máximo absoluto de 30 días desde login sin extensión por uso diario, protección servidor, recovery de 1 hora con Resend, reset y Cuenta/cambio de contraseña.
- Tests de acceso, sesión, token, revocación y fallos; arnés común coordinado con los otros owners.
- Fuera de alcance: registro público, roles/multiadmin, OAuth/SMS/2FA, edición de perfil/email no aprobada, tema visual, productos e invariantes comerciales.

## Capabilities

### New Capabilities

- `cuenta-administrativa`: acceso, sesión y recuperación de una única cuenta, incluyendo cambio autenticado de contraseña.

### Modified Capabilities

Ninguna: no hay specs principales anteriores. Los deltas no significan implementación.

## Impact

Futuro: `lib/modulos/autenticacion`, infraestructura DB/auth/email y schema `auth.ts`; login/guard/shell/cuenta y rutas de reset. Dependencias aprobadas se instalarán en este slice, no en la preparación. No tablas comerciales.

E0 entrega pronto DB/guard/arnés; no depende de Producto. Coordinar package/lock/Drizzle/configs compartidos con Augusto y Claudio. No impedir pruebas puras de los otros mientras se integra E0.

## Traceability

RF-01/02 son referencia humana provisional; SRS/RUP canónicos y CU pendientes. I1–I6, J1–J4, actualizaciones 8/9 y RNF temáticos de acceso/protección. [Blueprint](../../../docs/BLUEPRINT_IMPLEMENTACION_MVP.md), [gaps](../../../docs/TRAZABILIDAD_MVP.md), ADR-003/004/005/006/008. Sesión absoluta de 30 días y recovery de 1 hora aprobados por producto/seguridad, pendientes de formalización canónica. Otras sesiones tras cambio autenticado y reemisión de recovery siguen pendientes; no extrapolar recuperación. Nombre/email son solo lectura, sin edición autorizada.

## Acceptance Criteria

Acceso no autorizado rechazado también al llamar comandos directamente; alta pública imposible y setup seguro/único; sesión verificable/revocable con vencimiento absoluto a 30 días aunque haya actividad diaria. Recovery de 1 hora, neutral incluso ante fallo de entrega, un uso, enlace y todas las sesiones previas invalidados, sin auto-login; fixtures no son cuentas. Matriz de errores y tests del diseño satisfechos, incluida contraseña nueva rechazada con enlace no consumido si lo soporta la versión fijada, verificada sin asumir garantía. Reemisión documentada/decidida según soporte nativo antes de cerrar recovery; sin infraestructura propia compleja. Otras sesiones tras cambio autenticado: único bloqueo de ese subflujo, no de todo Auth. Cuenta solo identidad visible/contraseña/logout, Configuración solo tema admin-only fuera del slice. Tareas/pruebas completas con evidencia antes de aceptación técnica; workflow vigente sin PR/revisión cruzada obligatorios. No aplicar este change durante esta corrección documental.
