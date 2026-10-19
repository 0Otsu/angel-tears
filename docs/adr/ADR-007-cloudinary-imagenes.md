# ADR-007: Cloudinary para la imagen principal de producto

**Estado: ACEPTADO — 19/10/2026**, decisión técnica tomada bajo autorización expresa del responsable para elegir una estrategia en esta tarea. Sin cuenta, credenciales, suscripción ni integración creadas.

## Evaluación

| Opción | Adecuación / costo operativo | Compromiso |
| --- | --- | --- |
| Cloudinary | Almacenamiento, transformaciones y CDN de imágenes en una solución; plan gratuito publicado y escalamiento por uso. Independiente del hosting Next. | Dependencia de identificadores/transformaciones del proveedor; vigilar cuotas y costo real. |
| Vercel Blob | Object storage simple y SDK; optimización de imagen requiere pipeline adicional. | Mayor afinidad operativa con Vercel cuando aún no se eligió hosting. |
| S3-compatible | Objetos portables y amplio ecosistema. | Configurar bucket, permisos, CDN y optimización aumenta operación para una imagen por producto. |

La decisión prioriza facilidad operativa y entrega optimizada; **no garantiza costo cero**. Cuotas/tarifas se revisan al crear la cuenta, sin fijar precios en la arquitectura.

## Decisión y frontera

Cloudinary mediante SDK servidor y carga autenticada, sin presets unsigned. Adaptador simple `almacenarImagen` / `eliminarImagen` / `urlImagen`, propiedad de Productos. Dominio recibe referencia opaca; no depende de clases del SDK. Guardar referencia y dimensiones, nunca binarios en PostgreSQL ni escribir uploads en `public/` del deployment.

Handler multipart autenticado para una imagen JPEG/PNG/WebP, máximo **3 MiB** y **20 megapíxeles**, tipo real comprobado con decoder, límites de bytes antes/durante lectura, nombre/ID generado en servidor, sin SVG/HTML/GIF ni URL remota arbitraria. Son límites técnicos de seguridad, no nuevos campos de negocio. 3 MiB deja margen para multipart en hosts con límites de cuerpo reducidos; verificar el límite concreto del despliegue antes de liberar.

Reemplazo: subir con ID nuevo sin sobrescribir → validar resultado del proveedor → transacción con control de versión del Producto para adjuntar referencia → después de commit limpiar recurso anterior. Si falla upload o BD, Producto conserva referencia anterior; compensar nuevo recurso no adjuntado. Fallo de limpieza no revierte un producto ya guardado: log redactado y reintento operativo. No borrar imagen anterior antes de confirmar la nueva ni presuponer transacción distribuida.

Alta: guardar oculto sin imagen, luego adjuntar imagen a su ID; publicar solo cuando existe referencia válida. Así no se necesitan uploads huérfanos preproducto ni un gestor de medios. Un crash puede dejar objeto huérfano: reconciliación operativa por prefijo/antigüedad y referencias de BD antes de eliminar, sin panel nuevo.

Entrega responsive por CDN con transformaciones acotadas y URLs versionadas; `next/image` con loader controlado a Cloudinary para productos, evitando doble optimización. OG usa URL HTTPS absoluta del mismo recurso. No modificar ahora `next.config.mjs` ni `unoptimized: true` de la UI actual. Los recursos históricos del local no se suben automáticamente. Ocultar protege la ficha pública; no promete retirar copias ya compartidas de una imagen pública del CDN.

## Consecuencias y pendientes

Reemplazo fallido y conflicto concurrente se prueban antes de cerrar Productos. Fijar credenciales server-only y prefijo por entorno al operar. El adaptador permite migrar proveedor conservando la referencia de aplicación, sin introducir repositorios genéricos ni multicloud.

Fuentes: [Cloudinary, precios](https://cloudinary.com/pricing), [Upload API](https://cloudinary.com/documentation/image_upload_api_reference), [Vercel Blob](https://vercel.com/docs/vercel-blob), [S3](https://aws.amazon.com/s3/). Consultadas el 19/10/2026.
