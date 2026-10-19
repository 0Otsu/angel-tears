# Alcance del MVP

## Sitio público

- Home.
- Catálogo y detalle de producto.
- Información del negocio, horarios y ubicación.
- Acceso a WhatsApp e Instagram.
- SEO/indexabilidad.
- Uso desde celular y computadora.

Los valores reales de contacto, horarios, ubicación e identidad visual deben aportarse y validarse; no inventarlos.

## Administración

- Iniciar y cerrar sesión.
- Productos, visibilidad pública y destacado booleano simple (actualización expresa del 19/10/2026).
- Stock y stock mínimo opcional.
- Proveedores.
- Registro y consulta de compras; anulación de compras.
- Registro y consulta de ventas; anulación de ventas.
- Registro y consulta de egresos manuales; anulación de egresos.
- Finanzas: resultado económico aproximado + egresos, sin navegación Reportes separada si cubre el alcance.
- Cuenta: nombre/email visibles, cambio de contraseña y recuperación por email; provisión inicial controlada, sin registro público.
- Configuración: solo tema claro/oscuro persistente, exclusivo de `/admin/*`, separado de Cuenta.
- Dashboard operativo que compone datos de módulos reales, sin analytics avanzado ni widgets configurables.

Las reglas se detallan en [REGLAS_DOMINIO.md](REGLAS_DOMINIO.md). Este listado no define campos, pantallas, filtros ni criterios RF/CU aún ausentes.

## Fuera del MVP

- Carrito y checkout.
- Pagos online y Mercado Pago.
- Pedidos web.
- Envíos automatizados e integración logística.
- Cuentas de clientes.
- Múltiples administradores y múltiples sucursales.
- CMS.
- Ranking/campañas/banners administrables o motor de merchandising; destacado solo como flag simple.

Pueden evaluarse como evolución futura, pero no implementarse en el MVP sin revisión explícita del alcance por el equipo.

Las ampliaciones de destacado, Finanzas, Cuenta/Configuración y dashboard fueron autorizadas expresamente en la tarea de arquitectura del 19/10/2026 y requieren [sincronización SRS/RUP](TRAZABILIDAD_MVP.md); no nacen del template. Home sigue curada por equipo, sin CMS, reserva online, ERP, contabilidad impositiva ni IA.

## Límite de la iteración actual

UI Foundation sigue siendo el estado ejecutable: público navegable y administración visual con mocks. La entrega actual añade arquitectura/OpenSpec/documentación, sin persistencia, auth real ni CRUD. Las capacidades anteriores son objetivos futuros, no funciones terminadas. El [plan](PLAN_IMPLEMENTACION.md) y los tres changes de Ronda 1 no autorizan ejecución automática.
