# Seguridad

## Autenticación y autorización

- No implementar autenticación criptográfica desde cero. Better Auth con Drizzle/PostgreSQL y Resend para entrega están aprobados: [ADR-004](adr/ADR-004-better-auth-resend.md). Hashing, credenciales y reset se delegan a auth; no recrearlos.
- Nunca almacenar contraseñas en texto plano.
- Verificar autorización siempre en servidor y proteger todo acceso administrativo mediante autenticación y autorización.
- Sesión persistida en BD con máximo absoluto de 30 días desde login: el uso diario no extiende el máximo; al vencer exige nuevo login. Verificar configuración/versionado de Better Auth al implementar. Cookie HttpOnly/Secure en HTTPS/SameSite Lax con origen confiable, sin tokens en localStorage ni cookieCache que demore revocación. Logout real; reset de 1 hora/de un uso invalida enlace y todas las sesiones previas, sin auto-login. Solicitud pública de recuperación neutra incluso ante fallo de entrega.
- Ocultar enlaces administrativos no es un mecanismo de seguridad.
- Signup público deshabilitado; provisión de una sola cuenta mediante proceso controlado, idempotente/seguro y secreto no versionado. No contraseña en argumentos CLI, salida o logs; rechazar segunda cuenta, preservar credenciales existentes y documentar procedimiento. No roles, OAuth, magic links, SMS o 2FA. `/admin/cuenta`: nombre/email de solo lectura, contraseña/logout. `/admin/configuracion`: solo tema persistente admin-only, sin efectos públicos.
- Protección de origen/CSRF de Better Auth y Actions conservada: no desactivarla para solucionar integración; Handlers multipart verifican sesión y origen. No mutaciones por GET. Rate limiting de flujos sensibles con almacenamiento y política verificados en el slice; no solo memoria de una instancia como garantía productiva. Evitar bloqueo indefinido de la única administradora; valores exactos de intentos/ventana/bloqueo pendientes de implementación/operación.
- Otras sesiones tras cambio autenticado: pendiente, único bloqueo de ese subflujo; no extrapolar reset. Reemisión: preferir invalidar el anterior con soporte nativo maduro, documentar versión/comportamiento y decidir antes de cerrar recovery, sin infraestructura propia compleja. Contraseña nueva rechazada antes de completar reset conserva enlace sin consumir si la versión fijada lo soporta; verificar, no asumir garantía. Ver ADR-004 y matriz de errores del change Auth.

## Entradas e integridad

- Validar entradas en servidor; las comprobaciones de interfaz no sustituyen las del servidor.
- Zod en boundaries y reglas comerciales dentro de la operación; no usar la UI o TypeScript como autorización/validación runtime. Consultas parametrizadas mediante Drizzle; identificadores/orden dinámicos solo allowlist.
- Utilizar transacciones de base de datos cuando operaciones críticas modifiquen múltiples datos.
- Preservar stock no negativo, efectos completos y anulaciones únicas incluso ante concurrencia según locks/deduplicación de ADR-003. No loguear payload financiero completo innecesario ni devolver SQL/stack al cliente.
- Uploads según ADR-007: servidor autenticado, tipo real JPEG/PNG/WebP, máximo 3 MiB/20 MP, límites de lectura y validación de decoder; sin SVG/URL remota arbitraria/preset unsigned. Conservar imagen anterior ante fallo y limpiar solo referencias seguras. Sin binarios en PostgreSQL.
- Admin nunca en caché pública; DTO público sin costos, proveedor, actor, sesión o stock exacto. Cualquier nueva caché debe probar ocultación/agotado conforme a ADR-008.

## Secretos y registros

- Mantener secretos fuera del repositorio.
- `.env` nunca se versiona. Los archivos de entorno locales también quedan excluidos por `.gitignore`.
- `.env.example` se versiona con nombres y valores de ejemplo sin secretos reales (hoy: `DATABASE_URL` y `DATABASE_URL_TEST`); se amplía a medida que cada slice incorpora variables. Las pruebas de integración solo corren contra una base local terminada en `_test`.
- Nunca registrar contraseñas, tokens, URLs de recovery ni secretos en logs. Tampoco exponerlos, ni SQL/stack traces, en errores de UI/respuestas; omitir SQL/stacks/detalles sensibles de registros y conservar solo diagnóstico seguro. Ante sesión vencida al enviar: rechazar sin aplicar ni duplicar operación, solicitar login y conservar solo campos no sensibles de forma segura, limpiando contraseñas.
- Logs estructurados con correlación, módulo/operación/resultado/fecha y errores redactados; puntos de instrumentación en auth/tx/imagen/correo. Proveedor final de observabilidad pendiente, sin tracking incorporado.
- Antes de cada commit revisar los archivos preparados; `.gitignore` no sustituye esa revisión.

## Privacidad y seguimiento

No implementar todavía un banner de cookies. Analytics, Meta Pixel y otras tecnologías de seguimiento están pendientes de decisión y deben evaluarse junto con privacidad antes de incorporarse. No agregar herramientas de seguimiento por defecto.

Los datos personales necesarios, su conservación y las decisiones de privacidad concretas deben validarse al definir las funcionalidades y las herramientas. Este documento no fija requisitos legales ni una política de privacidad definitiva.
