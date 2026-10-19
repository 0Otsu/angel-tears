# ADR-008: límites Next.js, lecturas frescas y tema aislado del admin

**Estado: ACEPTADO — 19/10/2026**, decisiones técnicas bajo autorización de arquitectura. No altera UI/configuración ejecutable en esta entrega.

## Contexto y alternativas

Next 16.0.10/App Router ya existe. Se descartan REST interno para cada caso de uso, dominio dentro de React y caché pública que pueda servir productos ocultos. Para tema se compararon estado en memoria, localStorage global y preferencia persistida con render inicial servidor.

## Decisión

Server Components leen servicios/consultas servidor directamente; Client Components solo interacción. Server Actions delgadas para formularios internos: sesión, Zod, caso de uso y resultado seguro. Route Handlers para frontera HTTP real: Better Auth `/api/auth/[...all]` y multipart de imagen. No APIs REST comerciales paralelas a los casos de uso.

Ronda 1: consultas públicas por solicitud sin caché persistente compartida, Home/catálogo/PDP dinámicos cuando consuman BD; memoización solo por solicitud para compartir proyección entre render y metadata. Evitar que SSG de fixtures siga decidiendo disponibilidad. Administración nunca en caché pública. Tras commit, límites Next refrescan paths afectados; servicio de dominio no importa `next/cache`. No usar `revalidateTag(..., 'max')` para garantizar ocultación inmediata: admite contenido stale. Caché posterior requiere medir, ADR/tarea y pruebas de visibilidad; no se activa `cacheComponents` en este blueprint.

`generateMetadata`, sitemap y robots usan la proyección pública, no tablas privadas ni un fetch a la propia API. Público mantiene rutas `/catalogo/[slug]`; producto oculto/inexistente llama `notFound` antes de mostrar contenido. La PDP publicada agotada se conserva. Un fallo de BD no se convierte en 404. Más detalle en el blueprint.

Tema claro/oscuro en Ronda 3: preferencia por cuenta en BD, cookie tipada no sensible con `Path=/admin` como ayuda para login, y wrapper SSR `data-admin-theme` con tokens CSS **acotados al admin**. No clase global `dark` en html/body ni proveedor que cambie Home. Leer BD para cuenta autenticada y cookie validada para pantallas auth; default claro. Guardar preferencia mediante Action autorizada y actualizar cookie solo tras commit; sin flash de tema por esperar hidratación. No implementar selector o CSS ahora.

## Consecuencias

La solución prioriza coherencia con el volumen pequeño previsto, sin afirmar cifras de rendimiento no acordadas. `loading`, boundaries y resultados esperados por formulario se añaden en slices, manteniendo accesibilidad y entradas no sensibles. Proxy es una ayuda, no control único. La configuración de apariencia está separada de Cuenta/Auth conforme a la nueva decisión explícita.

Fuentes: [Next 16 y caché](https://nextjs.org/docs/app/guides/upgrading/version-16), [mutaciones](https://nextjs.org/docs/app/getting-started/updating-data), [metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images). Consultadas el 19/10/2026.
