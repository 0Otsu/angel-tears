## ADDED Requirements

### Requirement: Registro exacto y autorizado
El sistema SHALL registrar egresos manuales con concepto, importe ARS mayor que cero y fecha real obligatorios, observacion opcional y carga automatica. SHALL exigir Administradora en servidor antes de leer/escribir. SHALL mantener compras como fuente independiente sin generar egresos automaticos desde ellas.

#### Scenario: Confirmacion y recuperacion
- **WHEN** la Administradora confirma un egreso o reintenta la misma solicitud
- **THEN** se conserva un unico registro con importe exacto y fechas diferenciadas; no se redondean entradas de mas de dos decimales y una misma clave con otro contenido se rechaza.

#### Scenario: Sesion ausente
- **WHEN** se invoca una lectura o comando sin sesion valida
- **THEN** no se ejecutan consultas privadas ni escrituras; la UI permite volver a iniciar sesion.

### Requirement: Consulta e historial por fecha real
El sistema SHALL listar egresos por fecha real y estado, consultar detalle e historial de carga/anulacion y resumir importes vigentes exactos por periodo inclusivo. SHALL conservar anulados sin sumarlos a vigentes. La UI SHALL distinguir vacio, filtros invalidos y fallo tecnico y funcionar en escritorio/movil con teclado.

#### Scenario: Periodo historico
- **WHEN** se registra hoy un egreso de un periodo anterior
- **THEN** aparece en el periodo de operacion, no en el de carga; el resumen solo suma egresos manuales vigentes.

### Requirement: Anulacion unica sin edicion
El sistema SHALL anular un egreso confirmado una sola vez aun con solicitudes concurrentes. SHALL conservar importe, datos, fechas y actores, excluyendo el anulado de totales vigentes. SHALL corregir mediante anulacion y nuevo registro, sin edicion ni borrado de confirmados.

#### Scenario: Anulacion concurrente o repetida
- **WHEN** dos solicitudes intentan anular el mismo egreso
- **THEN** solo una registra la anulacion; la otra informa que ya estaba anulado y conserva el mismo historial sin modificar stock.
