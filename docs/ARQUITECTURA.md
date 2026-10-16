# Arquitectura

## Dirección inicial

**Monolito modular: una aplicación y una base de datos, con módulos del dominio bien separados.** Estado: ACEPTADO. Ver [ADR-001](adr/ADR-001-monolito-modular.md).

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

## Stack aceptado

Next.js full-stack, TypeScript y PostgreSQL para un monolito modular full-stack. Estado: **ACEPTADO**, por autorización humana del 16/10/2026. Ver [ADR-002](adr/ADR-002-nextjs-fullstack.md).

La aplicación usa App Router y Tailwind de la UI aprobada. PostgreSQL está elegido pero no integrado. ORM, autenticación, validación, testing framework, imágenes, hosting, error tracking, analytics y CI definitivo siguen pendientes de ADR posteriores.

## Superficies públicas y administrativas

Las rutas y la UI foundation están en [UX_UI.md](UX_UI.md). El acceso administrativo requiere autenticación y autorización del servidor. Ocultar un enlace no aporta seguridad.

## Decisiones futuras

Estructura física de código, esquema de datos, contratos, manejo de concurrencia y mecanismo de transacciones se concretarán después de la validación técnica. Las operaciones críticas deben mantener las [reglas del dominio](REGLAS_DOMINIO.md) y los [principios de seguridad](SEGURIDAD.md).


## Estructura ejecutable actual

`app/` contiene Home, `/catalogo`, `/catalogo/[slug]` y Admin con grupo de layout `(panel)` separado del login. `components/` aloja UI pública, Boty, admin y los componentes shadcn usados. `lib/mock/` centraliza fixtures; `lib/negocio-publico.ts` los datos de contacto; `public/` solo los seis assets alcanzables. No existen ORM, conexión de BD, rutas legacy ni módulos vacíos.

Las rutas públicas tienen metadata y HTML inicial; las siete PDP de muestra se prerenderizan. Admin es solo una superficie visual accesible sin auth, con robots noindex; no constituye un límite de seguridad. Los módulos previstos de la tabla se crearán al implementar cada vertical slice, no durante esta base.
