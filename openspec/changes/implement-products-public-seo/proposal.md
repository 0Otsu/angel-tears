# Proposal

## Why

El catálogo y los productos actuales son mocks independientes de stock. Augusto implementará el slice vertical Producto → público → SEO con un único modelo y las reglas aprobadas, conservando la identidad visual pública.

## What Changes

- Owner: **Augusto**. Ronda **1**. Estado: planificación, tasks pendientes.
- Producto/Categoria únicos, datos obligatorios/opcionales, slug estable, imagen principal, publicación y destacado booleano.
- Administración real de productos e integración de Home/catálogo/PDP con disponibilidad de Inventario.
- SEO técnico/local/producto: metadata, OG, canonical, JSON-LD, sitemap/robots, performance y accesibilidad.
- Fuera de alcance: escribir saldo, Compras/Ventas/Finanzas, CMS/Home editor, ranking/campañas, inventar materiales/horarios, carrito/pagos/pedidos, tema admin.

## Capabilities

### New Capabilities

- `productos`: información, identidad estable, imagen, publicación y destacado simple.
- `catalogo-publico`: listado/Home/PDP elegibles, contacto e información comercial confirmada.
- `seo-publico`: contenido rastreable, metadata/compartir, indexación y estructura veraz.

### Modified Capabilities

Ninguna: no hay specs principales previas.

## Impact

Futuro: schema `producto.ts`, servicios de Producto/Catálogo, adaptador Cloudinary, componentes públicos/admin existentes y convenciones Next SEO. P0 debe entregar schema/DTO temprano. Depende de E0 guard/DB y C0 saldo/disponibilidad; usar dobles solo para desarrollo/tests unitarios, no aceptación comercial.

## Traceability

RF-03..07 y RNF temáticos de indexabilidad/acceso web/PC-mobile, referencia humana provisional; A/C/L/M y actualización 8. [Blueprint](../../../docs/BLUEPRINT_IMPLEMENTACION_MVP.md), [gaps](../../../docs/TRAZABILIDAD_MVP.md), ADR-003/005/006/007/008. Destacado/imagen/PDP/SEO se formalizan con fuentes académicas sin inventar RF/CU.

## Acceptance Criteria

Un solo Producto persistido; slug estable; publicación exige imagen; reemplazo fallido preserva anterior. Catálogo y Home elegibles por stock real; PDP publicada agotada accesible y oculto 404. Metadata y JSON-LD coherentes, sin datos falsos/privados; público conserva identidad y no requiere sesión. Dominio/catálogo comercial finales se registran como dependencias de aceptación productiva, no se rellenan con mocks. No ejecutar tasks durante blueprint.
