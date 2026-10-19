# Design

## Context

Ver proposal y blueprint 3–10/12. Augusto posee Producto, categorías, imagen y proyección pública; no schema/saldo de Inventario. Se reutilizan Boty/shadcn cuando sirvan, sin template como requisito.

## Goals / Non-Goals

Producto real de extremo a extremo, fuentes públicas frescas y SEO veraz. Sin CMS/checkout/reserva, ranking, stock duplicado ni cambios de apariencia pública por tema admin.

## Decisions

- P0: schema Producto/Categoria y DTO interno; categorías lookup con los siete códigos aprobados. ID UUID y slug único legible/estable; colisión añade sufijo estable al crear, nunca renombra URLs existentes. Nombre/precio/categoría requeridos, opcionales A6 sin valores inventados.
- Alta oculta + crearSaldoCero de C0 en misma tx. Precio actual no altera líneas históricas. Escritura con versión para evitar sobrescribir imagen/datos concurrentes; publicación valida imagen en servidor. Destacado solo flag, no motor de merchandising.
- Cloudinary vía adaptador/Handler autenticado y límites del ADR-007. Guardar oculto → adjuntar imagen → publicar. Reemplazo con ID nuevo, control de versión, compensación y cleanup postcommit; tests con doble, sin recursos comerciales.
- Catálogo compone Producto/Inventario en query explícita y devuelve DTO público, sin costo/proveedor/actor/stock exacto. No fetch a API interna; RSC por solicitud, Client para interacción. Metadata comparte lectura por request. Stock/ocultación revalidados en servidor.
- Listado: publicado && stock>0. Home destacados añade destacado; categorías filtran la misma elegibilidad. PDP publicada agotada devuelve contenido/Sin stock y schema OutOfStock; oculto/inexistente notFound, error de BD no es 404.
- SEO usa dominio de despliegue validado, slug estable, imagen HTTPS y datos reales; Product/Offer y LocalBusiness mínimos sin reviews/horarios/materiales inventados. Sitemap incluye publicadas agotadas y excluye ocultas/admin. No Search Console/GBP automatizados.
- Responsive, teclado/foco/labels y performance medidos en recorridos reales; reemplazar SSG de fixtures al conectar BD. No aplicar tema global ni rediseñar Home para expresar identidad.

## Risks / Trade-offs

- C0/E0 faltantes → DTO/puertos/dobles para avanzar; aceptación con Inventario/Auth reales obligatoria.
- Upload/DB no comparten tx → compensación, conservar anterior, limpiar sin destruir referencia válida.
- Pérdida de SEO por ocultación/caché → consultas frescas y pruebas HTML/meta/404/sitemap.
- Contenido/dominio final no disponible → pendiente explícito para producción; no canonical localhost ni datos comerciales de muestra publicados como reales.

## Migration Plan

P0 temprano y migración en turno; después alta+saldo C0/guard E0, imagen/publicación, catálogo/PDP/Home reales y SEO. Mantener contratos del sitio y estilos; sustituir fixtures por proyección, no migrarlos como productos reales. Rollback de código compatible, sin borrar productos/historia/recursos antes de comprobar referencias.

## Open Questions

Dominio final, credenciales/cuotas de Cloudinary y contenido comercial real. Política de precio cero/signos/límites se resuelve con responsable antes de cerrar su validación. No están pendientes modelo único, categorías iniciales, proveedor de imágenes, visibilidad o tratamiento de agotados/ocultos.
