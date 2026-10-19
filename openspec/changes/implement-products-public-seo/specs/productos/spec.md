# Spec Delta

## Purpose

Gestionar un único Producto desde administración hasta su publicación, con identidad estable, campos reales, una imagen principal y destacado simple sin perder historia.

Fuente A/C/L y actualización 8; RF-04..07 de referencia, imagen/destacado con gap SRS/RUP. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Campos reales y categoría fija
El sistema SHALL requerir nombre, precio y categoría, y admitir descripción/material/medida/color/cuidados opcionales, sin inventar valores. Las categorías son las siete aprobadas, sin CRUD adicional; disponibilidad se deriva del stock.

#### Scenario: Producto con datos opcionales omitidos
- **WHEN** se guarda un producto con sus datos obligatorios válidos
- **THEN** los opcionales pueden permanecer vacíos y la disponibilidad no se edita manualmente.

### Requirement: Publicación con imagen
El sistema SHALL permitir guardar oculto sin imagen y exigir una imagen principal válida para publicar; existe una sola imagen principal por producto.

#### Scenario: Publicar sin imagen
- **WHEN** se intenta publicar sin imagen válida
- **THEN** no se publica y se conserva el producto oculto con un error comprensible.

### Requirement: Reemplazo que conserva referencia
El sistema SHALL permitir subir/reemplazar la imagen desde Admin y conservar la anterior si falla la nueva carga o su guardado, sin dejar una referencia rota.

#### Scenario: Fallo de reemplazo
- **WHEN** falla la carga o el guardado de la nueva referencia
- **THEN** la imagen anterior continúa vigente y se informa el error sin perder datos del producto.

### Requirement: Identidad e historia estables
El sistema SHALL conservar el slug existente al renombrar, no eliminar físicamente productos y no modificar importes históricos de compras/ventas al cambiar el precio actual.

#### Scenario: Renombrar y cambiar precio
- **WHEN** se modifican nombre/precio de un producto con operaciones anteriores
- **THEN** su URL y los importes históricos permanecen intactos.

### Requirement: Destacado simple
El sistema SHALL permitir marcar destacado como booleano sin ranking/campañas y SHALL respetar las reglas de publicación/stock para su presencia pública.

#### Scenario: Destacado oculto o agotado
- **WHEN** un producto destacado se oculta o queda sin stock
- **THEN** deja de aparecer en Home/listados aunque conserve el flag.
