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

Decisión técnica autorizada por el responsable el 22/10/2026: conservar `0000_auth-base` y generar a continuación `0001_catalogo-proveedores-base`, exclusivamente con las tablas nuevas `categoria`, `producto` y `proveedor` y sus restricciones/índices. El schema Proveedor ya está integrado en main sin migración; se acepta explícitamente este turno conjunto de Drizzle. Producto/Categoría siguen siendo de Augusto y Proveedores de Claudio. No es un requisito funcional nuevo ni modifica SRS/RUP. No incluir Inventario, Compras ni `crearSaldoCero`. Revisar SQL/journal/snapshot antes de aplicar y reconstruir desde cero en PostgreSQL aislado; ningún cambio sobre Auth ni otra tabla está autorizado en esta migración.

Evidencia local del turno: SQL generado sin edición manual, seis sentencias (tres tablas, una FK restrictiva y dos índices); snapshot enlazado a `0000` sin cambiar sus cinco tablas Auth y journal con nueva entrada `idx: 1`. Reconstrucción desde bases vacías de desarrollo/test en un contenedor Docker exclusivo con PostgreSQL 17; dos migraciones aplicadas en cada base, hashes coincidentes y reaplicación sin cambios. `pnpm test:integration`: 67 pruebas/8 archivos aprobados, incluidas ocho pruebas reales de Producto para semilla idempotente, precisión, lectura, slug, imagen, FK y rollback SQL. Esto no prueba alta con saldo cero ni completa C0; no hay Inventario/Compras. La semilla se ejecuta explícitamente en los tests, no al importar ni como datos comerciales dentro de la migración. Configuración `.env.local` ignorada y credenciales solo locales; sin SRS/RUP ni servicios productivos.

## Evidencia actual de C0 — 23/10/2026

La integración de Claudio `9ce67c3`, incorporada a main por `36d4b3b`, agrega `0002_inventario-base` después de `0000_auth-base` y `0001_catalogo-proveedores-base`, sin regenerarlas. Sustituye el bloqueo histórico de C0 indicado en las notas anteriores. No modifica las decisiones funcionales ni el ownership.

La task Producto 1.4 queda satisfecha en el límite interno de persistencia: el llamador abre `db.transaction`, invoca `insertarProductoOcultoConSaldo(tx, id, entrada, crearContratoInventario(db).crearSaldoCero)` y propaga cualquier fallo. Producto inserta oculto/no destacado y entrega exactamente esa tx a C0; Inventario inserta el saldo 0 con mínimo null y no abre ni confirma una tx independiente. Augusto conserva Producto/Categoría y su adaptador; Claudio conserva Inventario/C0 y las escrituras de saldo. Ningún campo de stock se agrega a Producto.

Evidencia reutilizada: [persistencia.integracion.test.ts de Inventario](../../../lib/modulos/inventario/persistencia.integracion.test.ts), bloque «saldo cero junto al alta de Producto (C0)». El helper crea productos mediante ambos adaptadores persistentes; la prueba de creación verifica saldo 0/mínimo null/versión 1 y la FK exige el Producto. La prueba de rollback provoca un fallo después de insertar Producto y saldo y comprueba que ambas filas desaparecen. No son mocks de SQL ni un test que solo comprueba la identidad del handle. La suite conjunta de 27 pruebas pasó nuevamente durante este cierre; la compatibilidad de la historia completa en PostgreSQL 17.10/18.4 ya se verificó en la auditoría de integración. No se crean pruebas duplicadas.

Esto no implementa el caso de uso administrativo/endpoint/UI de 2.1. La coordinación humana del DTO de 1.1 sigue abierta: el contrato actual conserva UUID, precio decimal string/ARS, categorías, publicación e imagen válida; incluye ocultos, omite IDs inexistentes y exige sesión antes de leer. No expone saldo/costos/Auth. La compatibilidad técnica no sustituye la aceptación de Claudio/Emi sobre campos y semántica.

## Open Questions

Dominio final, credenciales/cuotas de Cloudinary y contenido comercial real. Política de precio cero/signos/límites se resuelve con responsable antes de cerrar su validación. No están pendientes modelo único, categorías iniciales, proveedor de imágenes, visibilidad o tratamiento de agotados/ocultos.

## P0 local — 20/10/2026

Base real revisada `17dbb44`; trabajo exclusivamente en rama local `feature/productos-publico-seo`, sin merge/push/PR por instrucción humana. Evidencia/alcance/gaps en [revisión local P0](../../../docs/REVISION_LOCAL_P0.md). No interpretar el estado histórico del blueprint como ausencia de E0 o reglas ya presentes.

Schema Producto/Categoría y semilla explícita preparados, sin ejecutarlos ni generar migración definitiva: Auth todavía no tiene schema/migración y conserva el primer turno. No referencias a User ni tablas ajenas ausentes. DTO/consulta privada batched con `exigirAdministradora` de E0 (instancia actual falla cerrada), sin stock dentro de Producto. Se comparte como `consultarProductosInternos(headers, ids)`; IDs UUID deduplicados, ocultos incluidos, inexistentes omitidos, errores técnicos propagados, precio decimal string/ARS y campos de identidad/categoría/publicación/imagenValida únicamente. La coordinación humana del DTO continúa pendiente; no se atribuye aprobación a Emi/Claudio.

`insertarProductoOcultoConSaldo` recibe tx del llamador y `CrearSaldoCero` existente; no duplica C0 ni conecta su doble a runtime. Test de transporte comprueba mismo handle y solicitud de rollback; atomicidad/concurrencia real quedan pendientes de Inventario SQL y PostgreSQL de prueba. Cero/signos de precio solo se representan técnicamente, sin decidir su aceptación comercial ni exponer alta/edición de usuario. No se avanzó a tareas de UI, Cloudinary, público o SEO.
