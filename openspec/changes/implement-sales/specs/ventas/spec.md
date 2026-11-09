## Purpose

Registrar y consultar ventas internas de varios productos con precios históricos, fechas comerciales y efecto atómico en el stock, incluyendo anulación única y trazable.

Fuente F1–F7 y B6; RF-15..17 de referencia, SRS/RUP canónicos pendientes. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Registro multilínea con precio histórico
El sistema SHALL registrar fecha real de venta, una o más líneas de producto con cantidad entera positiva, el nombre y el precio unitario de cada línea al momento de la venta, el total calculado y la fecha automática de carga, con comprador opcional; un cambio posterior del Producto no reescribe esa historia.

#### Scenario: Venta sin comprador
- **WHEN** se registra una venta válida con varias líneas y sin comprador
- **THEN** se conservan fecha real, líneas, precios y total, y la venta se presenta como Consumidor Final sin crear un cliente.

#### Scenario: Cambio posterior de precio
- **WHEN** cambia el precio actual de un Producto vendido antes
- **THEN** las ventas anteriores conservan el precio unitario y el total originales.

#### Scenario: Mayor precisión monetaria
- **WHEN** un importe se ingresa con más de dos decimales
- **THEN** se rechaza sin redondeo silencioso ni registro parcial.

### Requirement: Stock suficiente y confirmación atómica
El sistema SHALL verificar el stock de todas las líneas antes de confirmar y confirmar cabecera, líneas, descuento de stock e historia como una unidad completa o sin efecto; el stock nunca queda negativo y se puede vender un producto oculto si tiene stock.

#### Scenario: Stock insuficiente
- **WHEN** alguna línea supera el stock disponible
- **THEN** no se registra la venta ni se modifica el stock, se informa el disponible y el formulario conserva lo ingresado sin ajustar cantidades.

#### Scenario: Última unidad
- **WHEN** dos ventas simultáneas piden la última unidad de un producto
- **THEN** solo una se confirma y la otra se rechaza sin dejar el stock negativo.

#### Scenario: Producto oculto con stock
- **WHEN** se vende internamente un producto no publicado que tiene stock
- **THEN** la venta se confirma y descuenta stock sin publicar el producto.

### Requirement: Efecto único ante repetición
El sistema SHALL identificar cada operación lógica por una clave de solicitud y su contenido, de modo que repetir la misma solicitud no duplica la venta ni el descuento.

#### Scenario: Respuesta perdida
- **WHEN** se reintenta una solicitud ya confirmada con la misma clave y el mismo contenido
- **THEN** se recupera la venta ya registrada sin otro efecto en el stock.

#### Scenario: Misma clave con otro contenido
- **WHEN** se envía la misma clave con un contenido diferente
- **THEN** se rechaza como conflicto sin registrar nada.

### Requirement: Confirmada no editable
El sistema SHALL impedir editar o borrar una venta confirmada; una corrección se hace anulándola y registrando otra, sin perder historia.

#### Scenario: Corrección de una línea
- **WHEN** se detecta un error en una venta confirmada
- **THEN** no se modifican sus líneas; se anula y se registra una venta nueva.

### Requirement: Anulación única con reintegro
El sistema SHALL conservar la venta anulada con su historia y reintegrar el stock de todas sus líneas exactamente una vez, aun ante solicitudes simultáneas.

#### Scenario: Anulación
- **WHEN** se anula una venta confirmada
- **THEN** pasa a anulada, el stock de cada línea se reintegra una vez y la venta sigue consultable.

#### Scenario: Doble anulación
- **WHEN** se solicita dos veces anular la misma venta
- **THEN** solo se produce un reintegro y la historia conserva la anulación original.

### Requirement: Consulta de ventas
El sistema SHALL listar y mostrar el detalle de las ventas filtrando por estado y por fecha real de operación, distinguiendo confirmadas de anuladas y los estados vacío y de error.

#### Scenario: Rango por fecha real
- **WHEN** se consulta un rango de fechas
- **THEN** se usa la fecha real de la venta y no la fecha de carga.

### Requirement: Acceso autorizado
El sistema SHALL exigir sesión de Administradora en cada lectura y comando de ventas, ejecutando el caso de uso solo después de la autorización.

#### Scenario: Comando sin sesión
- **WHEN** se invoca registrar o anular sin sesión válida
- **THEN** no se ejecuta nada y no se produce ningún efecto en ventas ni stock.
