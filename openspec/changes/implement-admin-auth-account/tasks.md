# Tasks

## 1. E0: infraestructura compartida y trazabilidad

- [ ] 1.1 Leer fuentes/gaps y confirmar pendientes específicos de Cuenta; entregar nota de límites sin inventar RF/CU.
- [ ] 1.2 Coordinar package/lock/config con Augusto y Claudio; fijar dependencias aprobadas compatibles y verificar instalación reproducible.
- [ ] 1.3 Crear conexión Drizzle/pg server-only, migraciones y arnés de PostgreSQL aislado; probar conexión/rollback sin apuntar a datos reales y documentar variables sin secretos.
- [ ] 1.4 Configurar Vitest/RTL/Playwright y scripts reales coordinados; comprobar test mínimo útil del boundary de identidad, DOM si RTL lo requiere y browsers Playwright instalados; documentar comandos/entorno con PostgreSQL aislado y mail fake, sin servicios/datos productivos.
- [ ] 1.5 Publicar contrato exigirAdministradora y protocolo de migraciones; verificar consumidor de prueba sin duplicar negocio.

## 2. Cuenta inicial y acceso

- [ ] 2.1 Generar/revisar schema Better Auth y migración auth en turno de integración; verificar tablas/índices y tests contra PostgreSQL.
- [ ] 2.2 Implementar signup deshabilitado y provisión controlada/idempotente; probar alta única/reintento/concurrencia, rechazo de segunda cuenta sin alterar credenciales y signup público imposible; documentar procedimiento sin contraseña en argumentos CLI, salida ni logs.
- [ ] 2.3 Integrar login email/contraseña y matriz de errores del diseño; probar válido/inválido, entrada malformada, DB indisponible, campos seguros y ausencia de SQL/stacks/tokens/URLs/contraseñas/secretos en errores/logs. Limitar abuso sin bloqueo indefinido; concretar/documentar intentos y ventanas al implementar/operar, sin valores inventados.
- [ ] 2.4 Proteger consultas/comandos/admin en servidor y redirigir login autenticado; probar acceso directo, mutación sin sesión y sesión vencida al enviar, sin efectos ni duplicados y con conservación solo de campos seguros.
- [ ] 2.5 Configurar persistencia/cookies/expiración y logout conforme a versión fijada; probar reapertura, máximo absoluto de 30 días desde login incluso con uso diario, límites de vencimiento, cookie inválida y logout efectivo. Documentar opciones/evidencia, sin extender el máximo por actividad.

## 3. Recuperación y Cuenta

- [ ] 3.1 Integrar Resend solo como entrega y URLs de origen confiable; probar mail fake/fallo de entrega con respuesta pública siempre neutra, sin URLs/tokens en errores/logs; documentar remitente pendiente.
- [ ] 3.2 Implementar reset de 1 hora/un uso con revocación global en transacción y sin auto-login; probar válido antes del límite/vencido al límite/usado/inválido, doble consumo concurrente y rollback. Verificar enlace no consumido al rechazar nueva contraseña antes del reset si la versión fijada lo soporta, documentando evidencia/limitaciones. Comprobar qué ocurre al reemitir: preferir invalidación nativa madura del anterior; documentar/decidir antes de cerrar recovery sin infraestructura propia compleja.
- [ ] 3.3 Crear `/admin/cuenta` con nombre/email de solo lectura, contraseña y acceso a logout; verificar ausencia de edición de identidad/perfil/roles. Documentar `/admin/configuracion` solo tema persistente admin-only, sin efectos públicos, R3 fuera de este slice.
- [ ] 3.4 Obtener decisión del responsable sobre otras sesiones al cambiar contraseña autenticada y registrarla antes de cerrar ese flujo; no deducirla del reset.
- [ ] 3.5 Implementar cambio autenticado con contraseña actual y política acordada; probar contraseña incorrecta, éxito y sesiones según decisión, con mensajes accesibles.

## 4. Integración y aceptación

- [ ] 4.1 Ejecutar E2E login/sesión/logout/reset/Cuenta y pruebas de protección directa; verificar que ninguna ruta comercial usa guard mock al aceptar el slice.
- [ ] 4.2 Ejecutar lint/typecheck/test/build disponibles y validación OpenSpec estricta; actualizar mapa/evidencia y registrar RF/CU todavía provisionales.
- [ ] 4.3 Integrar mediante flujo Git vigente: sincronizar main reciente, resolver conflictos entendidos, checks técnicos y diff, merge/push/aviso al equipo; coordinar contratos con otros slices, sin PR/aprobación cruzada obligatorios y con revisión adicional recomendable. Conservar change activo hasta aceptación técnica con evidencia; no marcar tareas por planificación.

## Workflow follow-up

- Sincronizar y archivar solo después de implementación aceptada, nunca durante esta preparación.
