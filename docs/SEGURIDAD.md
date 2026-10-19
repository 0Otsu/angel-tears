# Seguridad

## Autenticación y autorización

- No implementar autenticación criptográfica desde cero. Better Auth con Drizzle/PostgreSQL y Resend para entrega están aprobados: [ADR-004](adr/ADR-004-better-auth-resend.md). Hashing, credenciales y reset se delegan a auth; no recrearlos.
- Nunca almacenar contraseñas en texto plano.
- Verificar autorización siempre en servidor y proteger todo acceso administrativo mediante autenticación y autorización.
- Sesión persistida en BD, hasta 30 días, cookie HttpOnly/Secure en HTTPS/SameSite Lax con origen confiable, sin tokens en localStorage ni cookieCache que demore revocación. Sin refresh indefinido. Logout real; reset temporal/de un uso invalida sesiones y requiere login.
- Ocultar enlaces administrativos no es un mecanismo de seguridad.
- Signup público deshabilitado; provisión de una sola cuenta mediante proceso controlado y secreto no versionado. No roles, OAuth, magic links, SMS o 2FA. Cuenta y preferencias de apariencia son capacidades diferentes.
- Protección de origen/CSRF de Better Auth y Actions conservada: no desactivarla para solucionar integración; Handlers multipart verifican sesión y origen. No mutaciones por GET. Rate limiting de flujos sensibles con almacenamiento y política verificados en el slice; no solo memoria de una instancia como garantía productiva.

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
- Un futuro `.env.example` sí se versionará, con nombres y valores de ejemplo sin secretos reales. No se crea aún porque no se eligió la configuración de la aplicación.
- Nunca registrar contraseñas, tokens ni secretos en logs.
- Logs estructurados con correlación, módulo/operación/resultado/fecha y errores redactados; puntos de instrumentación en auth/tx/imagen/correo. Proveedor final de observabilidad pendiente, sin tracking incorporado.
- Antes de cada commit revisar los archivos preparados; `.gitignore` no sustituye esa revisión.

## Privacidad y seguimiento

No implementar todavía un banner de cookies. Analytics, Meta Pixel y otras tecnologías de seguimiento están pendientes de decisión y deben evaluarse junto con privacidad antes de incorporarse. No agregar herramientas de seguimiento por defecto.

Los datos personales necesarios, su conservación y las decisiones de privacidad concretas deben validarse al definir las funcionalidades y las herramientas. Este documento no fija requisitos legales ni una política de privacidad definitiva.
