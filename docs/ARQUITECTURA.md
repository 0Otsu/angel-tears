# Arquitectura

## Dirección inicial

**Monolito modular: una aplicación y una base de datos, con módulos del dominio bien separados.** Estado: ACEPTADO COMO DIRECCIÓN INICIAL - PENDIENTE DE REVISIÓN DEL EQUIPO. Ver [ADR-001](adr/ADR-001-monolito-modular.md).

Priorizar simplicidad, modularidad, mantenibilidad, facilidad de evolución y reglas de negocio explícitas. Evitar microservicios, múltiples repositorios, event-driven innecesario, infraestructura compleja y abstracciones sin necesidad real.

## Módulos previstos

| Módulo | Responsabilidad prevista |
| --- | --- |
| autenticacion | Inicio/cierre de sesión y control de acceso administrativo. |
| productos | Información del producto y visibilidad pública. |
| inventario | Stock, mínimo opcional y consulta de stock bajo. |
| proveedores | Información de proveedores usada por la administración. |
| compras | Registro, consulta y anulación de compras. |
| ventas | Registro, consulta y anulación de ventas. |
| egresos | Registro, consulta y anulación de egresos manuales. |
| reportes | Resultado económico aproximado con operaciones vigentes. |

Estas responsabilidades orientan los límites. Los contratos entre módulos y la propiedad concreta de datos se diseñarán después de validar las fuentes. Evitar duplicar reglas de stock o resultados en pantallas o módulos consumidores.

## Stack propuesto

Next.js full-stack, TypeScript y PostgreSQL para un monolito modular full-stack. Estado: **PROPUESTO - PENDIENTE DE VALIDACIÓN DEL EQUIPO**. Ver [ADR-002](adr/ADR-002-nextjs-fullstack.md).

No instalar estas tecnologías en esta etapa. La propuesta no fija ORM, autenticación, validación, CSS/UI, imágenes, hosting, error tracking, analytics ni CI definitivo. Se evaluarán mediante ADR posteriores.

## Superficies públicas y administrativas

La propuesta de rutas y navegación está en [UX_UI.md](UX_UI.md), pendiente de revisión durante UX/UI. El acceso administrativo requiere autenticación y autorización del servidor. Ocultar un enlace no aporta seguridad.

## Decisiones futuras

Estructura física de código, esquema de datos, contratos, manejo de concurrencia y mecanismo de transacciones se concretarán después de la validación técnica. Las operaciones críticas deben mantener las [reglas del dominio](REGLAS_DOMINIO.md) y los [principios de seguridad](SEGURIDAD.md).
