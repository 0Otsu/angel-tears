# Tasks

## 1. E0: infraestructura compartida y trazabilidad

- [ ] 1.1 Leer fuentes/gaps y confirmar pendientes específicos de Cuenta; entregar nota de límites sin inventar RF/CU.
- [ ] 1.2 Coordinar package/lock/config con Augusto y Claudio; fijar dependencias aprobadas compatibles y verificar instalación reproducible.
- [ ] 1.3 Crear conexión Drizzle/pg server-only, migraciones y arnés de PostgreSQL aislado; probar conexión/rollback sin apuntar a datos reales y documentar variables sin secretos.
- [ ] 1.4 Configurar Vitest/RTL/Playwright y scripts reales coordinados; comprobar test mínimo útil del boundary de identidad y documentar comandos/entorno.
- [ ] 1.5 Publicar contrato exigirAdministradora y protocolo de migraciones; verificar consumidor de prueba sin duplicar negocio.

## 2. Cuenta inicial y acceso

- [ ] 2.1 Generar/revisar schema Better Auth y migración auth en turno de integración; verificar tablas/índices y tests contra PostgreSQL.
- [ ] 2.2 Implementar signup deshabilitado y provisión controlada; probar alta única/reintento/concurrencia y ausencia de endpoint público de registro; documentar operación segura.
- [ ] 2.3 Integrar login email/contraseña y errores neutros; probar válido/inválido y rechazo de entrada malformada sin logs sensibles.
- [ ] 2.4 Proteger consultas/comandos/admin en servidor y redirigir login autenticado; probar acceso directo y llamada a mutación sin sesión.
- [ ] 2.5 Configurar persistencia/cookies/expiración y logout; probar reapertura, vencimiento, cookie inválida y logout efectivo, y documentar política de 30 días.

## 3. Recuperación y Cuenta

- [ ] 3.1 Integrar Resend solo como entrega y URLs de origen confiable; probar correo simulado/fallo de entrega/respuesta neutra y documentar remitente pendiente.
- [ ] 3.2 Implementar reset temporal de un uso con revocación global en transacción; probar expirado/usado/inválido, doble consumo concurrente y rollback.
- [ ] 3.3 Crear Cuenta con nombre/email de solo lectura; verificar ausencia de edición de perfil/roles y documentar separación de Configuración.
- [ ] 3.4 Obtener decisión del responsable sobre otras sesiones al cambiar contraseña autenticada y registrarla antes de cerrar ese flujo; no deducirla del reset.
- [ ] 3.5 Implementar cambio autenticado con contraseña actual y política acordada; probar contraseña incorrecta, éxito y sesiones según decisión, con mensajes accesibles.

## 4. Integración y aceptación

- [ ] 4.1 Ejecutar E2E login/sesión/logout/reset/Cuenta y pruebas de protección directa; verificar que ninguna ruta comercial usa guard mock al aceptar el slice.
- [ ] 4.2 Ejecutar lint/typecheck/test/build disponibles y validación OpenSpec estricta; actualizar mapa/evidencia y registrar RF/CU todavía provisionales.
- [ ] 4.3 Integrar mediante flujo Git normal y verificar contratos con otros slices; conservar el change activo hasta revisión/aceptación y no marcar tareas sin evidencia.

## Workflow follow-up

- Sincronizar y archivar solo después de implementación aceptada, nunca durante esta preparación.
