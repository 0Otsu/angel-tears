# Decisiones pendientes

Este registro separa decisiones aprobadas y vacíos de definición. Nada pendiente se considera aprobado por estar mencionado. Actualización de arquitectura del 19/10/2026; ownership R1 en [blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md), sin owners de rondas posteriores.

## Estados actuales

| Tema | Estado / siguiente paso |
| --- | --- |
| Monolito modular: una aplicación y una base de datos | ACEPTADO por autorización humana del 16/10/2026. Ver ADR-001. |
| Next.js full-stack, TypeScript, PostgreSQL | ACEPTADO por autorización humana del 16/10/2026. PostgreSQL aún sin integración. Ver ADR-002. |
| Rutas públicas y administrativas, acceso por URL/favorito y sin enlace destacado | UI foundation aprobada y migrada; no sustituye autenticación y autorización. |
| Acceso a datos / auth / email / validación | Drizzle, Better Auth, Resend y Zod APROBADOS por responsable; ADR-003/004/005. Sin instalar/implementar. |
| Estrategia de pruebas | Vitest/RTL/Playwright APROBADOS, ADR-006; arnés/scripts todavía no creados. |
| Imágenes | Cloudinary elegido bajo autorización técnica, ADR-007; cuenta/cuotas/secretos y operación pendientes. |
| Modelo / contratos / transacciones / Next | Diseño acordado en blueprint y ADR-003/008; no tablas/migraciones/código creados. |

## Fuentes y producto

- Incorporar SRS corregida/validada y artefactos RUP corregidos por la cátedra; verificar consistencia y completar trazabilidad RF/CU. No inventar sus identificadores.
- Confirmar detalles de requisitos y criterios de aceptación que esas fuentes definan.
- Horarios definitivos, logo limpio y catálogo comercial completo siguen pendientes. Dirección, Instagram y WhatsApp (+54 9 3454 26-6760) reconfirmados el 19/10/2026. Mantener «Consultar horarios vigentes» y recursos actuales para el MVP; cambios de datos generales mediante código/despliegue, sin CMS. La imagen del acceso es una edición de Street View con atribución, no una fotografía directa nueva del comercio. Ver decisiones M.
- Validar UX/UI y detalles de campos/estados no resueltos expresamente. Las decisiones A–M del responsable están en [DECISIONES_PRODUCTO_MVP.md](DECISIONES_PRODUCTO_MVP.md), aprobadas el 19/10/2026 y pendientes de alineación/formalización con SRS/RUP cuando corresponda; no se sobrescriben fuentes superiores.
- Disponibilidad pública resuelta en producto (A1–A6): listado publicado con stock > 0, PDP publicada agotada accesible con «Sin stock», oculto con 404, venta interna de oculto con stock. Stock bajo `<=`, mínimo opcional/0 distinto de ausente, unidades enteras y ajustes explícitos trazables aprobados (B1–B6). No implementados.
- Moneda/precisión/fechas/períodos resueltos en H; representación exacta `numeric(18,2)`/string/centavos bigint y fechas definidas en ADR-003. Signos/cero/límites comerciales y restricciones no aprobadas de fechas/saldo inicial requieren decisión antes de su recorrido; no inferirlas del tipo SQL.
- Campos/correcciones A–G definidos; no editar operaciones confirmadas, anular/recrear con historia y efecto único. Las siete categorías quedaron aprobadas en la tarea actual; baja de proveedores sin historial sigue sin definir. Modelo/contratos globales diseñados en blueprint; validaciones comerciales restantes pendientes.
- Cuenta/sesiones/recuperación I/J y cierre final 9 aprobados: sesión con máximo absoluto de 30 días desde login; el uso diario no lo extiende y al vencer exige nuevo login. Recovery dura 1 hora, neutral incluso si falla el envío, un uso, invalida enlace y todas las sesiones previas, sin auto-login. Renovación y TTL no son decisiones de producto pendientes. Verificar configuración de la versión fijada de Better Auth al implementar; no auth implementada. Soporte seguro/remitente/secretos y formalización SRS/RUP pendientes.
- Cuenta en `/admin/cuenta`: nombre/email solo lectura, cambio autenticado de contraseña y logout; edición de nombre/email fuera del alcance autorizado, sin roles/perfil complejo. Configuración en `/admin/configuracion`: únicamente tema claro/oscuro persistente exclusivo de admin, sin cambios en Home/catálogo/PDP/identidad pública. Tema para R3, no ahora.
- **Cambio autenticado de contraseña:** definir qué sucede con las otras sesiones. Es el único bloqueo de ese subflujo; no bloquea todo Auth. No extrapolar J3, que solo resuelve recuperación.
- **Reemisión de recovery:** determinar qué ocurre con el primer enlace al solicitar otro. Preferir invalidación nativa madura de Better Auth si existe; de lo contrario no crear infraestructura propia compleja. Verificar/documentar versión y decidir antes de cerrar recuperación. Puede permanecer pendiente hasta implementar.
- **Protección de abuso:** endpoints sensibles con límites sin bloqueo indefinido de la única administradora; cantidad exacta de intentos y ventana/bloqueo se concretan al implementar/operar, sin inventar valores aprobados. Probar contraseña nueva rechazada antes de completar reset: conservar enlace sin consumir si la versión fijada lo soporta, sin asumir garantía de librería.
- Imagen principal administrable A6/L y estrategia Cloudinary/límites/compensación aprobados en ADR-007; imagen obligatoria para publicar. Cuenta/cuotas/prefijo/credenciales y verificación del límite del hosting al operar permanecen pendientes, no selección de proveedor.
- Destacado simple, Finanzas y dashboard operativo aprobados en actualización 8, con gaps académicos en [TRAZABILIDAD_MVP.md](TRAZABILIDAD_MVP.md). No ranking, CMS o analytics por asociación.
- Validar requisitos no funcionales y métricas, sin inventar objetivos cuantitativos.

Estas preguntas identifican vacíos para revisar con las fuentes; no son nuevos requisitos del MVP.

## Tecnología: evaluar mediante ADR

- Branding futuro y evolución de la UI; Tailwind y Boty adaptado ya son la base aprobada.
- Hosting final, proveedor PostgreSQL, dominio/HTTPS y operación del deployment.
- Error tracking.
- Analytics, Meta Pixel y cualquier seguimiento: evaluar junto con privacidad antes de incorporarlos.
- CI definitivo.

Las herramientas pendientes de esta sección no están elegidas. Las ya aprobadas se registran arriba/ADR; no se reabre su selección salvo incompatibilidad demostrada. Tampoco se implementa banner de cookies, analytics ni CI/CD avanzado en esta etapa.

## Diseño y colaboración

- Implementar en tareas futuras el modelo/contratos/transacciones acordados en blueprint, contrastando fuentes superiores al incorporarlas; no volver a diseñar Producto por cada owner.
- Crear arnés/scripts de testing aprobados en R1. Desarrollo/lint/typecheck/build ya configurados; `test` aún ausente.
- Revisar configuración efectiva de protecciones y controles de GitHub sin cambiarla en esta entrega. El workflow de esta etapa ya está decidido: ramas propias, checks, merge/push y aviso al equipo, sin PR/aprobación cruzada obligatorios; revisión adicional recomendable. Ver [GIT_WORKFLOW](GIT_WORKFLOW.md).
- Revisar y ajustar el orden general de implementación según prioridades grupales.

## Cómo cerrar una decisión

Registrar contexto, alternativas, consecuencias y validación humana. Usar ADR para decisiones técnicas relevantes y actualizar este registro y los documentos relacionados. Cambios de alcance o reglas requieren resolver primero las fuentes de mayor prioridad. Un agente no cierra decisiones por su cuenta.
