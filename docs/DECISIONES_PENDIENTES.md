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
- Confirmar horarios, logo y datos comerciales finales. Dirección, Instagram, WhatsApp (+54 9 3454 26-6760), tres historias reales e imagen del acceso ya fueron aportados; constan en la UI. La imagen del acceso es una edición de Street View con atribución, no una fotografía directa nueva del comercio.
- Validar UX/UI, campos, navegación y comportamiento de pantallas.
- Precisar disponibilidad pública, stock bajo (`<` o `<=`), cantidades y sus validaciones.
- Precisar moneda, redondeo, fechas y períodos de consultas/resultados.
- Definir modelo de estados, contratos y detalle de operaciones/anulaciones sin introducir funcionalidades no solicitadas.
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
