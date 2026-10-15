# Decisiones pendientes

Este registro separa direcciones iniciales, propuestas y vacíos de definición. Nada de lo pendiente se considera aprobado por estar mencionado aquí. No se asignan integrantes.

## Estados actuales

| Tema | Estado / siguiente paso |
| --- | --- |
| Monolito modular: una aplicación y una base de datos | ACEPTADO COMO DIRECCIÓN INICIAL - PENDIENTE DE REVISIÓN DEL EQUIPO. Ver ADR-001. |
| Next.js full-stack, TypeScript, PostgreSQL | PROPUESTO - PENDIENTE DE VALIDACIÓN DEL EQUIPO. Ver ADR-002; comparar alternativas. |
| Rutas públicas y administrativas, acceso por URL/favorito y sin enlace destacado | Propuesta revisable durante UX/UI. No sustituye autenticación y autorización. |
| Estrategia de pruebas | Propuesta por validar y concretar con las herramientas elegidas. |

## Fuentes y producto

- Incorporar SRS corregida/validada y artefactos RUP corregidos por la cátedra; verificar consistencia y completar trazabilidad RF/CU. No inventar sus identificadores.
- Confirmar detalles de requisitos y criterios de aceptación que esas fuentes definan.
- Aportar información real del negocio: horarios, ubicación, WhatsApp, Instagram, identidad visual, textos e imágenes.
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
- CSS/UI.
- Almacenamiento de imágenes.
- Hosting y deployment.
- Error tracking.
- Analytics, Meta Pixel y cualquier seguimiento: evaluar junto con privacidad antes de incorporarlos.
- CI definitivo.

No hay selección de estas herramientas. Tampoco se implementa un banner de cookies en esta etapa.

## Diseño y colaboración

- Concretar estructura del código, contratos entre módulos, esquema de datos y estrategia de transacciones/concurrencia después de validar arquitectura y fuentes.
- Elegir herramientas y comandos de testing, desarrollo y compilación.
- Revisar protecciones de ramas, estrategia de merge y controles de GitHub; no hay automatizaciones complejas configuradas.
- Revisar y ajustar el orden general de implementación según prioridades grupales.

## Cómo cerrar una decisión

Registrar contexto, alternativas, consecuencias y validación humana. Usar ADR para decisiones técnicas relevantes y actualizar este registro y los documentos relacionados. Cambios de alcance o reglas requieren resolver primero las fuentes de mayor prioridad. Un agente no cierra decisiones por su cuenta.
