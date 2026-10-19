# Spec Delta

## Purpose

Ofrecer Home, catálogo y ficha con productos comerciales elegibles y contacto confirmado, manteniendo identidad pública y distinguiendo agotado, oculto, inexistente y fallo.

Fuente A/M y actualización 8; RF-03/07 de referencia, SRS/RUP canónicos pendientes. [Trazabilidad](../../../../../docs/TRAZABILIDAD_MVP.md).

## ADDED Requirements

### Requirement: Listados elegibles
El sistema SHALL mostrar en listados solo productos publicados con stock mayor que cero; Home destacados además exige el flag y secciones de categoría usan la misma elegibilidad. No hay CMS de Home.

#### Scenario: Agotar y reponer
- **WHEN** un producto publicado llega a cero y luego recupera stock
- **THEN** desaparece del listado y reaparece al reponerse si continúa publicado, sin perder historia.

### Requirement: Ficha publicada agotada
El sistema SHALL conservar accesible la ficha publicada sin stock y mostrar «Sin stock», sin carrito, compra online, reserva ni pedido web.

#### Scenario: Abrir URL de agotado publicado
- **WHEN** se abre directamente su URL
- **THEN** se obtiene la ficha con estado de agotado y los contactos aprobados.

### Requirement: Oculto e inexistente
El sistema SHALL responder 404 para un producto oculto o inexistente y no exponer datos privados; un fallo de lectura no se presenta como inexistencia ni catálogo vacío.

#### Scenario: URL conocida de producto oculto
- **WHEN** un visitante abre esa URL
- **THEN** no recibe la ficha del producto y la respuesta es 404.

#### Scenario: Servicio de datos indisponible
- **WHEN** falla la consulta del catálogo
- **THEN** se informa el error recuperable sin simular que no hay productos.

### Requirement: Información comercial y experiencia preservadas
El sistema SHALL mantener dirección/contactos confirmados y «Consultar horarios vigentes» hasta confirmación, acceso público sin sesión y diseño usable en PC/mobile sin depender de tema admin.

#### Scenario: Consultar desde móvil y cambiar tema admin
- **WHEN** se visita el público desde móvil, con o sin preferencia admin
- **THEN** se conservan su identidad, navegación/contactos y horarios provisionales, sin requerir login.
