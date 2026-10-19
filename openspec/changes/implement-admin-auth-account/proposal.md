# Proposal

## Why

El acceso administrativo actual solo navega sobre mocks y no puede proteger datos reales. Emi implementará el slice de identidad/cuenta de Ronda 1 conforme a decisiones I/J y actualización 8, sin ejecutar trabajo comercial.

## What Changes

- Owner: **Emi**. Ronda: **1**. Estado: planificación; ninguna task ejecutada.
- Base Drizzle compartida necesaria para auth, schema de Better Auth y provisión inicial controlada.
- Login/logout, sesión persistente, protección servidor, recuperación email con Resend, reset y Cuenta/cambio de contraseña.
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

RF-01/02 son referencia humana provisional; SRS/RUP canónicos y CU pendientes. I1–I6, J1–J4, actualización 8 y RNF temáticos de acceso/protección. [Blueprint](../../../docs/BLUEPRINT_IMPLEMENTACION_MVP.md), [gaps](../../../docs/TRAZABILIDAD_MVP.md), ADR-003/004/005/006/008. La política de sesiones tras cambio autenticado y la edición de email siguen pendientes; no extrapolar recuperación.

## Acceptance Criteria

Acceso no autorizado rechazado también al llamar comandos directamente; alta pública imposible; sesión verificable/revocable; reset neutral, temporal/de un uso e invalidación global; fixtures no son cuentas. Tareas/pruebas del slice completas antes de aceptación; el recorrido de cambio autenticado no se cierra sin resolver su política pendiente. No aplicar este change durante la tarea de blueprint.
