# Arquitectura

## Dirección inicial

**Monolito modular: una aplicación y una base de datos, con módulos del dominio bien separados.** Estado: ACEPTADO. Ver [ADR-001](adr/ADR-001-monolito-modular.md).

Priorizar simplicidad, modularidad, mantenibilidad, facilidad de evolución y reglas de negocio explícitas. Evitar microservicios, múltiples repositorios, event-driven innecesario, infraestructura compleja y abstracciones sin necesidad real.

## Módulos previstos

| Módulo | Responsabilidad prevista |
| --- | --- |
| autenticacion / cuenta | Identidad, sesiones, provisión única, recuperación y cambio de contraseña. Emi R1. |
| productos | Producto único, categorías, imagen, slug, publicación y destacado simple. Augusto R1. |
| inventario | Saldo, mínimo, stock bajo, ajustes e historia. Claudio R1. |
| proveedores | Datos mínimos e inactivación con historia. Claudio R1. |
| compras | Registro multilínea, consulta y anulación transaccional. Claudio R1. |
| ventas | Registro, consulta y anulación de ventas. |
| finanzas / egresos | Resultado aproximado y egresos manuales. R2 sin responsable asignado. |
| catalogo / experiencia publica / SEO | Proyección pública Producto+Inventario; no otro Product. Augusto R1. |
| apariencia admin | Tema persistente claro/oscuro admin-only. R3 sin responsable asignado. |

Los límites, ownership de archivos, modelo global, contratos y dependencias se definen en [BLUEPRINT_IMPLEMENTACION_MVP.md](BLUEPRINT_IMPLEMENTACION_MVP.md), aprobado como planificación el 19/10/2026. El blueprint es el plano central: este documento orienta y enlaza, sin duplicar sus tablas. Admin es shell/navegación de capacidades diferentes, no un módulo único. No duplicar stock ni resultados en pantallas.

## Stack aceptado

Next.js full-stack, TypeScript y PostgreSQL para un monolito modular full-stack. Estado: **ACEPTADO**, por autorización humana del 16/10/2026. Ver [ADR-002](adr/ADR-002-nextjs-fullstack.md).

La aplicación usa App Router y Tailwind de la UI aprobada. PostgreSQL está elegido pero no integrado. Drizzle, Better Auth, Resend, Zod y Vitest/RTL/Playwright aprobados expresamente el 19/10; Cloudinary elegido bajo autorización técnica. Formalizados en [ADR-003..008](adr/README.md), sin instalación funcional. Hosting, proveedor PostgreSQL, observabilidad final, analytics y CI/CD avanzado siguen pendientes.

## Superficies públicas y administrativas

Las rutas y la UI foundation están en [UX_UI.md](UX_UI.md). El acceso administrativo requiere autenticación y autorización del servidor. Ocultar un enlace no aporta seguridad.

## Diseño acordado y decisiones futuras

RSC para lecturas; Client solo interacción; Actions autorizadas para formularios y Handlers para auth/upload. Módulos proporcionales bajo `lib/modulos` y esquemas separados bajo infraestructura, sin mover masivamente `app/components`. Una transacción incluye operación, líneas, saldo e historia; locks ordenados y restricciones impiden negativos/reversiones dobles. Ver blueprint/ADR para detalles técnicos, dinero, imágenes y tema aislado. Las [reglas](REGLAS_DOMINIO.md) y [seguridad](SEGURIDAD.md) siguen siendo obligatorias; SRS/RUP y gaps no se dan por formalizados.


## Estructura ejecutable actual

`app/` contiene Home, `/catalogo`, `/catalogo/[slug]` y Admin con grupo de layout `(panel)` separado del login. `components/` aloja UI pública, Boty, admin y los componentes shadcn usados. `lib/mock/` centraliza fixtures; `lib/negocio-publico.ts` los datos de contacto; `public/` contiene siete assets alcanzables: seis migrados y la imagen del acceso incorporada durante la revisión. No existen ORM, conexión de BD, rutas legacy ni módulos vacíos.

Las rutas públicas tienen metadata y HTML inicial; las siete PDP de muestra se prerenderizan. Admin es solo una superficie visual accesible sin auth, con robots noindex; no constituye un límite de seguridad. Los módulos de la tabla se crearán al implementar cada slice, no en esta preparación. [OpenSpec](OPENSPEC.md) contiene solo tres changes activos de R1 y tareas sin ejecutar; el roadmap posterior está en el [plan](PLAN_IMPLEMENTACION.md).
