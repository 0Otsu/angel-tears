# Seguridad

## Autenticación y autorización

- No implementar autenticación criptográfica desde cero. Elegir posteriormente una solución madura y documentar la decisión mediante ADR.
- Nunca almacenar contraseñas en texto plano.
- Verificar autorización siempre en servidor y proteger todo acceso administrativo mediante autenticación y autorización.
- Configurar las cookies de sesión de manera segura cuando se elija la solución de autenticación. Los atributos y mecanismos concretos se evaluarán con esa solución.
- Ocultar enlaces administrativos no es un mecanismo de seguridad.

## Entradas e integridad

- Validar entradas en servidor; las comprobaciones de interfaz no sustituyen las del servidor.
- Utilizar transacciones de base de datos cuando operaciones críticas modifiquen múltiples datos.
- Preservar stock no negativo, efectos completos y anulaciones únicas incluso ante concurrencia. La solución técnica sigue pendiente.

## Secretos y registros

- Mantener secretos fuera del repositorio.
- `.env` nunca se versiona. Los archivos de entorno locales también quedan excluidos por `.gitignore`.
- Un futuro `.env.example` sí se versionará, con nombres y valores de ejemplo sin secretos reales. No se crea aún porque no se eligió la configuración de la aplicación.
- Nunca registrar contraseñas, tokens ni secretos en logs.
- Antes de cada commit revisar los archivos preparados; `.gitignore` no sustituye esa revisión.

## Privacidad y seguimiento

No implementar todavía un banner de cookies. Analytics, Meta Pixel y otras tecnologías de seguimiento están pendientes de decisión y deben evaluarse junto con privacidad antes de incorporarse. No agregar herramientas de seguimiento por defecto.

Los datos personales necesarios, su conservación y las decisiones de privacidad concretas deben validarse al definir las funcionalidades y las herramientas. Este documento no fija requisitos legales ni una política de privacidad definitiva.
