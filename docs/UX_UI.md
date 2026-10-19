# UX/UI

## Rutas de la UI foundation

| Superficie | Ruta | Uso |
| --- | --- | --- |
| Pública | `/` | Home e información pública. |
| Pública | `/catalogo` | Catálogo público. |
| Pública | `/catalogo/[slug]` | Detalle de producto. |
| Administración | `/admin` | Acceso al área administrativa. |
| Administración | `/admin/login` | Inicio de sesión. |

Estado: base visual aprobada, migrada desde staging y con ajustes puntuales del local aprobados durante la revisión humana. Home incluye #el-local (FeatureSection / Vení a conocernos), #de-ustedes (Testimonials con tres historias reales) y #contacto (Instagram y WhatsApp). Admin incluye Resumen, Productos, Stock, Proveedores, Compras, Ventas, Egresos, Reportes y Configuración; todos son mocks.

No mostrar un enlace destacado a Administración en la navegación pública. La responsable puede acceder por URL directa o favorito. **Ocultar el enlace NO es un mecanismo de seguridad.** Todo acceso administrativo debe protegerse mediante autenticación y autorización del servidor, incluidas operaciones y accesos directos.

## Objetivos de experiencia

Uso desde celular y computadora. Flujos comprensibles para consultar productos y registrar operaciones. Contemplar errores, cargas, estados vacíos y confirmaciones que ayuden a comprender el resultado de una acción. Se preservan tipografías, tokens, radios, espaciados, animaciones y responsive de Boty adaptado. Los campos y flujos definitivos requieren validar SRS/RUP.

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

La base usa metadata, HTML semántico, alt y rutas canónicas. Home se prerenderiza, catálogo filtra en cliente con HTML inicial y las PDP se prerenderizan desde mocks. No se agregan analytics, schema complejo, Search Console o campañas. Sitemap/robots globales quedan para una tarea específica. El tratamiento SEO de productos ocultos o sin disponibilidad requiere validación específica.

## Accesibilidad y contenido

Considerar navegación por teclado, foco visible, etiquetas comprensibles, contraste y estructura semántica en la revisión básica. La UI aprobada conserva los placeholders de productos/hero. El local usa Street View aportado con atribución y encuadre del acceso; «Cómo llegar» integrado en Ubicación con pin. Historias/dirección/Instagram/Maps/WhatsApp confirmados; horarios/logo limpio/contenido comercial definitivo pendientes. Sin CMS; destacado booleano simple aprobado expresamente el 19/10, sin ranking/campañas.

## Organización objetivo aprobada — no implementada

La nueva tarea de arquitectura reemplaza únicamente organización/alcance explícitos anteriores; no cambia ahora rutas, componentes o estilos. [Blueprint](BLUEPRINT_IMPLEMENTACION_MVP.md) define los mecanismos.

| Superficie | Objetivo |
| --- | --- |
| Inicio admin | Dashboard operativo derivado de datos reales, sin analytics o widgets configurables. |
| Productos/Stock/Proveedores/Compras/Ventas | Capacidades separadas; shell Admin solo composición. |
| Finanzas | Resumen económico + Egresos; sin navegación Reportes paralela. |
| Cuenta `/admin/cuenta` | Nombre/email visibles, cambio contraseña/logout; recuperación en flujo Auth. |
| Configuración | Solo claro/oscuro persistente admin-only en R3. Nunca cambia apariencia del público. |
| Público | Home curada con productos reales/destacados/categorías; PDP agotada accesible y oculto 404; sin CMS/checkout/reserva. |

Detalles de loading/vacío/error/foco/confirmación acompañan cada slice. Las propuestas de SEO/JSON-LD de la tarea actual se concretan en ADR-008/blueprint y no alteran el hecho de que hoy solo existen metadata/fixtures básicos.


## Límite de seguridad de esta iteración

/admin/login → submit → /admin y Cerrar sesión → /admin/login son solo navegación mock. Admin no está protegido ni crea cookies/tokens. Las páginas muestran DATOS DE DEMOSTRACIÓN y metadata noindex. El gráfico circular de Reportes está marcado CANDIDATO VISUAL - REQUIERE VALIDACIÓN, fuera de la pantalla principal. Las reglas de seguridad del MVP deberán implementarse con la auth elegida.
