# Spec Delta

## Purpose

Permitir rastreo, indexación y vistas previas coherentes del contenido público real de Angel Tears, sin inventar datos comerciales ni exponer administración o productos ocultos.

Fuente RF-03/RNF indexabilidad suministrados y tarea actual; cobertura canónica pendiente. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: HTML y metadata coherentes
El sistema SHALL entregar contenido público útil y metadata individual con canonical/imagen absoluta coherentes con la URL estable, de modo que plataformas que leen metadata puedan generar vistas previas sin datos ficticios.

#### Scenario: Compartir producto publicado
- **WHEN** una plataforma obtiene el HTML de su URL
- **THEN** encuentra nombre, descripción aplicable, canonical e imagen real HTTPS coherentes con la ficha.

### Requirement: Datos estructurados veraces
El sistema SHALL representar producto/precio ARS/disponibilidad e identidad local con datos confirmados; SHALL omitir horarios/materiales/reviews/servicios no validados, sin prometer posicionamiento.

#### Scenario: Producto publicado agotado
- **WHEN** se consulta su ficha y representación estructurada
- **THEN** ambas indican agotado y no una disponibilidad o precio de fixture.

#### Scenario: Horarios no confirmados
- **WHEN** se generan datos locales del negocio
- **THEN** no se publican horarios históricos como actuales ni se inventan coordenadas/servicios.

### Requirement: Indexación según visibilidad
El sistema SHALL incluir URLs públicas elegibles en sitemap, mantener PDP publicadas agotadas, excluir ocultos/admin/reset y evitar que robots/noindex sustituyan autorización.

#### Scenario: Ocultar una ficha
- **WHEN** se oculta un producto previamente publicado
- **THEN** su URL deja el sitemap y responde 404, sin mantener una ficha pública por caché persistente.

### Requirement: Accesibilidad y carga proporcionadas
El sistema SHALL ofrecer semántica, textos alternativos, teclado/foco y estados comprensibles en PC/mobile, con dimensiones y entrega responsive de imágenes sin cargar JS o recursos innecesarios del template.

#### Scenario: Navegación sin mouse
- **WHEN** se recorre catálogo/ficha/contacto por teclado
- **THEN** controles y enlaces son alcanzables, el foco es visible y los estados no dependen solo del color.
