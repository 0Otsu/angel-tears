# Spec Delta

## Purpose

Gestionar un único Producto desde administración hasta su publicación, con identidad estable, campos reales, una imagen principal y destacado simple sin perder historia.

Fuente A/C/L y actualización 8; RF-04..07 de referencia, imagen/destacado con gap SRS/RUP. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Administracion clara y operaciones coordinadas
El sistema SHALL priorizar el listado persistido con filtros y acciones accesibles, ofrecer alta y edicion dedicadas y reutilizar los comandos reales de datos/imagen/publicacion. El alta permanece oculta hasta publicacion explicita con imagen valida.

#### Scenario: Alta guiada
- **WHEN** la administradora guarda los datos de un producto nuevo
- **THEN** continua con Imagenes y Vista previa sobre el ID persistido, puede finalizar oculto y solo publicar cuando el servidor acepta la referencia de imagen.

#### Scenario: Imagen y borrador de datos
- **WHEN** confirma una carga o reemplazo propio mientras conserva un borrador de datos
- **THEN** se conserva el borrador y la edicion posterior utiliza la version confirmada, sin adoptar cambios ajenos silenciosamente.

#### Scenario: Acciones de listado
- **WHEN** la administradora publica/oculta o destaca/quita destacado desde el menu
- **THEN** se ejecuta el comando autorizado/versionado, se informa su resultado y los conflictos ofrecen recarga explicita sin borrado fisico.

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

### Requirement: Galeria acotada de Producto
Por ampliacion expresa del responsable del 01/11/2026, el sistema SHALL admitir hasta siete imagenes vigentes por producto en una relacion explicita; conservar las imagenes existentes como primera/principal, sin recrear assets ni modificar datos comerciales. Los limites y validacion real JPEG/PNG/WebP de 2.2 siguen vigentes. Video queda pendiente y SHALL NOT aceptarse mediante el flujo de imagenes.

#### Scenario: Seleccion multiple y fallo individual
- **WHEN** se seleccionan varias imagenes dentro del cupo disponible
- **THEN** se inicia automaticamente la cola serial, sin otro boton global de subir; cada archivo tiene identidad, preview local, Pendiente/Subiendo/Procesando/Cargada/Error y progreso de transferencia real. Un fallo no reinicia los exitosos y el retry reenvia solo ese archivo completo desde cero.

#### Scenario: Avanzar con imagenes pendientes
- **WHEN** hay archivos pendientes, transferencias/procesamiento o errores sin resolver
- **THEN** no se avanza a Vista previa hasta confirmar las cargas o quitar los errores; no se presenta una seleccion local como referencia persistida.

### Requirement: Vista previa administrativa del PDP
Por ajuste expreso del responsable del 02/11/2026, el sistema SHALL ofrecer una vista previa autorizada de los datos persistidos, galeria/principal y disponibilidad real, reutilizando la presentacion y proyeccion del PDP sin publicar temporalmente ni duplicar stock. La lectura exige sesion antes de consultar y comprueba la version abierta; el publico conserva filtro de publicado/404 y SEO propios.

#### Scenario: Revisar un producto oculto
- **WHEN** la administradora abre Vista previa de un producto oculto con version vigente
- **THEN** ve sus datos/imagenes confirmados y disponibilidad de Inventario, puede volver a Datos/Imagenes sin crear otro Producto y su URL publica sigue respondiendo 404.

#### Scenario: Ver el producto publicado
- **WHEN** se confirma Publicar desde la vista previa o se abre el menu de un producto publicado
- **THEN** el pending termina y se ofrece Ver producto hacia el slug real, en otra pestaña anunciada accesiblemente; un oculto ofrece Vista previa administrativa en lugar de ese enlace publico.

#### Scenario: Sesion o version dejan de ser validas
- **WHEN** se solicita la vista previa sin sesion o con una version desactualizada
- **THEN** no se revelan datos sin autorizacion ni se adopta una version ajena sobre el borrador; se informa login/recarga segun corresponda.

#### Scenario: Seleccion excede el cupo
- **WHEN** imagenes guardadas mas seleccionadas superan siete
- **THEN** se rechaza toda la nueva seleccion con un mensaje; el backend tambien preserva el limite ante concurrencia.

#### Scenario: Gestion de principal y eliminacion
- **WHEN** se cambia la principal o se quita una imagen
- **THEN** la transaccion conserva como maximo una principal, proyectada al catalogo/Home/relacionados/SEO; quitar la principal promueve otra si existe, y quitar la ultima publicada se rechaza hasta ocultar el producto.

#### Scenario: Compatibilidad y limpieza
- **WHEN** se agrega, reemplaza o quita un medio
- **THEN** se confirma PostgreSQL antes de destruir recursos no referenciados; un fallo de cleanup conserva la galeria valida e informa conciliacion pendiente. Los endpoints historicos conservan su semantica de primera carga/reemplazo de principal.


### Requirement: Reemplazo que conserva referencia
El sistema SHALL permitir subir/reemplazar la imagen desde Admin y conservar la anterior si falla la nueva carga o su guardado, sin dejar una referencia rota.

#### Scenario: Fallo de reemplazo
- **WHEN** falla la carga o el guardado de la nueva referencia
- **THEN** la imagen anterior continúa vigente y se informa el error sin perder datos del producto.

#### Scenario: Limpieza anterior falla despues de confirmar
- **WHEN** la nueva referencia ya se confirmo en PostgreSQL y falla la eliminacion del recurso anterior
- **THEN** la imagen nueva continua vigente, se informa limpieza pendiente y no se revierte ni elimina la nueva referencia.

#### Scenario: Dos reemplazos de la misma version
- **WHEN** dos cargas intentan reemplazar la imagen desde la misma version del producto
- **THEN** solo una confirma; la perdedora recibe conflicto y limpia exclusivamente su recurso nuevo, sin borrar el ganador ni alterar los demas datos.

#### Scenario: Confirmacion de escritura desconocida
- **WHEN** se pierde el acuse de commit y tampoco puede verificarse la referencia persistida
- **THEN** no se destruyen recursos a ciegas, se informa error de confirmacion y queda conciliacion operativa pendiente.

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
