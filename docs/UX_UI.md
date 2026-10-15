# UX/UI

## Propuesta revisable de rutas

| Superficie | Ruta propuesta | Uso |
| --- | --- | --- |
| Pública | `/` | Home e información pública. |
| Pública | `/catalogo` | Catálogo público. |
| Pública | `/catalogo/[slug]` | Detalle de producto. |
| Administración | `/admin` | Acceso al área administrativa. |
| Administración | `/admin/login` | Inicio de sesión. |

Estado: propuesta de UX/arquitectura; puede revisarse durante UX/UI. La ubicación concreta de información del negocio, horarios, ubicación y contactos se diseñará sin inventar nuevas rutas obligatorias.

No mostrar un enlace destacado a Administración en la navegación pública. La responsable puede acceder por URL directa o favorito. **Ocultar el enlace NO es un mecanismo de seguridad.** Todo acceso administrativo debe protegerse mediante autenticación y autorización del servidor, incluidas operaciones y accesos directos.

## Objetivos de experiencia

Uso desde celular y computadora. Flujos comprensibles para consultar productos y registrar operaciones. Contemplar errores, cargas, estados vacíos y confirmaciones que ayuden a comprender el resultado de una acción. Los detalles visuales y de interacción siguen pendientes.

## SEO/indexabilidad

Es un requisito explícito del sitio público. Objetivos:

- Contenido público rastreable.
- Home indexable.
- Páginas públicas de productos indexables.
- URLs descriptivas.
- Metadata pertinente.
- Contenido semántico.
- Textos alternativos de imágenes.
- Sitemap y robots cuando se implemente.

No se define todavía cómo implementar estos objetivos ni se fija una estrategia de renderizado. El tratamiento SEO de productos ocultos o sin disponibilidad requiere validación específica.

## Accesibilidad y contenido

Considerar navegación por teclado, foco visible, etiquetas comprensibles, contraste y estructura semántica en la revisión básica. La identidad visual, textos finales, imágenes, horarios, dirección y enlaces reales de WhatsApp e Instagram están pendientes de aportes y validación. No incorporar un CMS ni productos destacados administrables.
