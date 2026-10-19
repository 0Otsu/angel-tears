# Decisiones pendientes

Este registro separa direcciones iniciales, propuestas y vacíos de definición. Nada de lo pendiente se considera aprobado por estar mencionado aquí. No se asignan integrantes.

## Estados actuales

| Tema | Estado / siguiente paso |
| --- | --- |
| Monolito modular: una aplicación y una base de datos | ACEPTADO por autorización humana del 16/10/2026. Ver ADR-001. |
| Next.js full-stack, TypeScript, PostgreSQL | ACEPTADO por autorización humana del 16/10/2026. PostgreSQL aún sin integración. Ver ADR-002. |
| Rutas públicas y administrativas, acceso por URL/favorito y sin enlace destacado | UI foundation aprobada y migrada; no sustituye autenticación y autorización. |
| Estrategia de pruebas | Propuesta por validar y concretar con las herramientas elegidas. |

## Fuentes y producto

- Incorporar SRS corregida/validada y artefactos RUP corregidos por la cátedra; verificar consistencia y completar trazabilidad RF/CU. No inventar sus identificadores.
- Confirmar detalles de requisitos y criterios de aceptación que esas fuentes definan.
- Horarios definitivos, logo limpio y catálogo comercial completo siguen pendientes. Dirección, Instagram y WhatsApp (+54 9 3454 26-6760) reconfirmados el 19/10/2026. Mantener «Consultar horarios vigentes» y recursos actuales para el MVP; cambios de datos generales mediante código/despliegue, sin CMS. La imagen del acceso es una edición de Street View con atribución, no una fotografía directa nueva del comercio. Ver decisiones M.
- Validar UX/UI y detalles de campos/estados no resueltos expresamente. Las decisiones A–M del responsable están en [DECISIONES_PRODUCTO_MVP.md](DECISIONES_PRODUCTO_MVP.md), aprobadas el 19/10/2026 y pendientes de alineación/formalización con SRS/RUP cuando corresponda; no se sobrescriben fuentes superiores.
- Disponibilidad pública resuelta en producto (A1–A6): listado publicado con stock > 0, PDP publicada agotada accesible con «Sin stock», oculto con 404, venta interna de oculto con stock. Stock bajo `<=`, mínimo opcional/0 distinto de ausente, unidades enteras y ajustes explícitos trazables aprobados (B1–B6). No implementados.
- Moneda/precisión/fechas/períodos resueltos en producto (H): ARS, hasta dos decimales sin redondeo silencioso, fecha real, mes actual/otro mes/rango personalizado y resultado aproximado sin anulados ni doble conteo. Límites restantes de importes/fechas y rango temporal requieren precisión; representación técnica no elegida.
- Campos mínimos y correcciones de productos/proveedores/compras/ventas/egresos definidos en A–G. No editar operaciones confirmadas: anular y registrar nuevamente según reglas, conservando historia y efectos únicos. Categorías iniciales pendientes de validar con propietaria; eliminación de proveedores sin historial no definida. Contratos y detalle restante de estados/validaciones siguen pendientes.
- Cuenta/sesiones/recuperación resueltas en producto (I/J): administradora única, email único + contraseña, sesión hasta 30 días con cierre manual, sin registro público ni roles/multiadmin; recuperación por email incluida en MVP con enlace temporal de un uso, respuesta neutra, invalidación global de sesiones y nuevo login. Formalización, provisión inicial, soporte seguro, vencimiento exacto del enlace y reemisión siguen pendientes; no hay auth implementada.
- Configuración acotada a nombre/email visibles y cambio autenticado de contraseña (K). Sigue pendiente resolver la condición sobre edición del email y el tratamiento de sesiones en ese cambio autenticado; J3 solo resuelve recuperación. No se crea un epic funcional de Configuración.
- Carga/reemplazo de una imagen principal por producto desde Admin aprobados (L), conservando la anterior ante fallo; imagen obligatoria para publicar, no para guardar oculto (A6). Almacenamiento y detalles de validación de archivos siguen pendientes.
- Validar requisitos no funcionales y métricas, sin inventar objetivos cuantitativos.

Estas preguntas identifican vacíos para revisar con las fuentes; no son nuevos requisitos del MVP.

## Tecnología: evaluar mediante ADR

- ORM / acceso a datos.
- Librería o solución madura de autenticación; sesiones y cookies seguras.
- Librería de validación.
- Framework concreto de testing.
- Branding futuro y evolución de la UI; Tailwind y Boty adaptado ya son la base aprobada.
- Almacenamiento de imágenes.
- Hosting y deployment.
- Error tracking.
- Analytics, Meta Pixel y cualquier seguimiento: evaluar junto con privacidad antes de incorporarlos.
- CI definitivo.

No hay selección de estas herramientas. Tampoco se implementa un banner de cookies en esta etapa.

## Diseño y colaboración

- Concretar estructura del código, contratos entre módulos, esquema de datos y estrategia de transacciones/concurrencia después de validar arquitectura y fuentes.
- Elegir framework y comandos de testing. Los comandos de desarrollo/lint/typecheck/build ya están configurados.
- Revisar protecciones de ramas, estrategia de merge y controles de GitHub; no hay automatizaciones complejas configuradas.
- Revisar y ajustar el orden general de implementación según prioridades grupales.

## Cómo cerrar una decisión

Registrar contexto, alternativas, consecuencias y validación humana. Usar ADR para decisiones técnicas relevantes y actualizar este registro y los documentos relacionados. Cambios de alcance o reglas requieren resolver primero las fuentes de mayor prioridad. Un agente no cierra decisiones por su cuenta.
