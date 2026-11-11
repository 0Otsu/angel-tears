## Context

ADR-003/005/006/008 y decisiones G/H. Se sigue la composicion de Compras/Ventas:
RSC/Action -> administracion autorizada -> Drizzle. Egresos tiene entidad y modulo
propios; no incorpora persistencia de resultados financieros ni otro inventario.

## Goals / Non-Goals

Objetivo: RF-18/19/20 para egresos manuales y contrato de resumen consumible luego.
Fuera: RF-21/Finanzas, Dashboard, edicion/borrado, categorias contables, automatismos
desde Compra, despliegue, datos falsos de desarrollo y cambios de contratos vecinos.

## Decisions

- numeric(18,2) como string; validar antes de SQL. Reutilizar compras/dinero puro
  como ya hace Ventas. Importe positivo, sin redondeo; limite tecnico, no comercial.
- Fecha real date ISO; creadoEn/anuladoEn timestamptz. Periodo inclusivo; mes comercial
  America/Argentina/Cordoba por defecto en UI. Resumen sin filtro abarca todas las
  fechas como Compras/Ventas; nunca usa fecha de carga.
- UUID estable + huella canonica + unique. INSERT ON CONFLICT arbitra solicitudes
  concurrentes. Repeticion devuelve registro existente, aun si despues fue anulado;
  otro contenido devuelve conflicto, sin volver a confirmar ni duplicar.
- Anulacion en transaccion con FOR UPDATE. Segundo intento devuelve ya_anulado;
  fecha y actor iniciales de anulacion se conservan. Historial son carga/anulacion
  de cabecera inmutable, sin inventar un sistema generico de eventos.
- Exigir sesion antes de SELECT/mutaciones; comandos via conAdministradora. Sin
  cookies propias ni llamadas directas a Better Auth. Errores tecnicos seguros en
  Actions; formularios conservan entradas y clave para retry, sin reenviar solos.
- Resumen retorna desde/hasta, vigentes.cantidad/total, anuladas.cantidad como los
  modulos vecinos. Una sola consulta agregada numeric, solo sobre egreso. Nunca
  se importan operaciones de Compra como egresos manuales.
- Lecturas limitadas a 50 (maximo 200), hayMas explicito y posibilidad de acotar
  fechas, siguiendo modulos existentes. No presentar subtotal parcial como total.

## Risks / Trade-offs

No es posible detectar semanticamente si una persona vuelve a cargar manualmente
una compra con otro UUID: se informa en formulario que compras se cargan en Compras.
No se impone unicidad por concepto/importe/fecha porque gastos iguales son validos.
No hay restriccion comercial nueva de fechas o longitud de texto sin fuente.
API no expone edicion/borrado; como modulos vecinos, permisos SQL operativos del
servidor no sustituyen un futuro cierre de seguridad del entorno productivo.

## Migration Plan

0006_egresos-base generada desde 0005; revisar SQL/journal/snapshot y segunda
generacion sin diferencias. Pruebas solo _test con guard; no aplicar a desarrollo.
Produccion y desarrollo requieren aplicacion posterior deliberada y respaldo segun
el proceso del equipo, no migraciones automaticas en arranque/build.

## Open Questions

Refinamiento autorizado del 11/11/2026: Gastos incorpora filtros automáticos y
paginación SQL en su consulta existente; registro, anulación, dinero y resúmenes
sin cambios. Evidencia en [Operaciones](../../../docs/features/OPERACIONES_LISTADOS.md).

Adaptación de presentación autorizada del 11/11/2026: nombre público «Gastos» en
Operaciones, ruta principal /admin/gastos; /admin/egresos redirige después de exigir
sesión y preserva filtros admitidos. Se reutilizan EgresosAdmin, diálogos, Actions
y servicios existentes; nombres técnicos, tabla, contratos e importes sin cambios.
Compras mantiene su fuente independiente y su efecto de stock; Gastos no incorpora
mercadería. Dashboard/Finanzas solo cambian etiquetas y enlaces. No se modifican
Google Docs/SRS/RUP. Validación y evidencia de esta adaptación en EGRESOS.md.

Aceptacion visual humana y E2E transversal del sistema se informan por separado.
Finanzas debe componer resumen de Compras/Ventas/Egresos con corte consistente
cuando se implemente; no sumar Compras otra vez como Egreso.
