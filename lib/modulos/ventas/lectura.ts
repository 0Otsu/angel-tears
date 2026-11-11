import { validarPaginacion, paginar } from "@/lib/paginacion"
import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import { centavosADecimal, decimalACentavos } from "@/lib/modulos/compras/dinero"
import type {
  EstadoVenta,
  FiltroVentas,
  ResultadoDetalleVenta,
  ResultadoListadoVentas,
  ResultadoResumenVentas,
  VentaDetalle,
} from "@/lib/modulos/ventas/contrato"
import { esFechaOperacionValida } from "@/lib/modulos/ventas/reglas-venta"

// Consultas de Ventas (change implement-sales, 4.1): listado y detalle por fecha de operacion y
// estado, y el resumen de ventas vigentes que consumen Dashboard y Finanzas. Solo lectura y sin
// sesion: cada Action debe exigir la Administradora antes de llamarlas.

export type Ejecutor = Pick<NodePgDatabase, "select">

const ESTADOS: readonly EstadoVenta[] = ["CONFIRMADA", "ANULADA"]

export async function cargarVenta(ejecutor: Ejecutor, cabecera: typeof venta.$inferSelect): Promise<VentaDetalle> {
  const lineas = await ejecutor
    .select()
    .from(ventaLinea)
    .where(eq(ventaLinea.ventaId, cabecera.id))
    .orderBy(asc(ventaLinea.numeroLinea))
  return {
    id: cabecera.id,
    fechaOperacion: cabecera.fechaOperacion,
    comprador: cabecera.comprador,
    total: cabecera.total,
    estado: cabecera.estado as EstadoVenta,
    creadoEn: cabecera.creadoEn.toISOString(),
    anuladoEn: cabecera.anuladoEn?.toISOString() ?? null,
    lineas: lineas.map((l) => ({
      numeroLinea: l.numeroLinea,
      productoId: l.productoId,
      nombreProducto: l.nombreProductoHistorico,
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitarioHistorico,
      subtotal: l.subtotal,
    })),
  }
}

function vacio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === ""
}

type Fechas = { desde: string | null; hasta: string | null }

function evaluarRango(filtro: FiltroVentas): { ok: true; fechas: Fechas } | { ok: false; errores: { desde?: string; hasta?: string } } {
  const errores: { desde?: string; hasta?: string } = {}
  const fechas: Fechas = { desde: null, hasta: null }
  for (const campo of ["desde", "hasta"] as const) {
    const valor = filtro[campo]
    if (vacio(valor)) continue
    if (esFechaOperacionValida(valor)) fechas[campo] = valor
    else errores[campo] = "Ingresá una fecha válida."
  }
  if (!errores.desde && !errores.hasta && fechas.desde && fechas.hasta && fechas.desde > fechas.hasta) {
    errores.hasta = "La fecha final no puede ser anterior a la inicial."
  }
  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true, fechas }
}

function condicionesDeFecha({ desde, hasta }: Fechas): SQL[] {
  return [
    ...(desde ? [gte(venta.fechaOperacion, desde)] : []),
    ...(hasta ? [lte(venta.fechaOperacion, hasta)] : []),
  ]
}

/** Mas recientes primero por fecha de operacion (no por fecha de carga). Incluye las anuladas. */
export async function listarVentas(db: Ejecutor, filtro: FiltroVentas = {}): Promise<ResultadoListadoVentas> {
  const errores: Partial<Record<"estado" | "desde" | "hasta" | "limite" | "pagina", string>> = {}
  const rango = evaluarRango(filtro)
  if (!rango.ok) Object.assign(errores, rango.errores)
  if (!vacio(filtro.estado) && !ESTADOS.includes(filtro.estado as EstadoVenta)) errores.estado = "Elegí un estado válido."
  const entrada = validarPaginacion(filtro)
  if (!entrada.success) for (const e of entrada.error.issues) errores[e.path[0] as "pagina" | "limite"] = e.message
  if (!rango.ok || !entrada.success || Object.keys(errores).length) return { estado: "datos_invalidos", errores }
  const { limite, pagina } = entrada.data
  const condiciones = [
    ...condicionesDeFecha(rango.fechas),
    ...(vacio(filtro.estado) ? [] : [eq(venta.estado, filtro.estado as EstadoVenta)]),
  ]
  const [conteo] = await db.select({ total: sql<number>`count(*)::int` }).from(venta).where(and(...condiciones))
  const paginacion = paginar(conteo.total, pagina, limite)
  const filas = await db
    .select({
      id: venta.id,
      fechaOperacion: venta.fechaOperacion,
      comprador: venta.comprador,
      total: venta.total,
      estado: venta.estado,
      creadoEn: venta.creadoEn,
      // Calificado a mano: en un select de una sola tabla Drizzle omite el nombre de tabla de las
      // columnas, y el subselect compararia venta_linea consigo misma.
      cantidadLineas: sql<number>`(select count(*)::int from "venta_linea" as "l" where "l"."venta_id" = "venta"."id")`,
    })
    .from(venta)
    .where(and(...condiciones))
    .orderBy(desc(venta.fechaOperacion), desc(venta.id))
    // Solo se transfieren las filas de la pagina; el total se calcula en PostgreSQL.
    .limit(limite).offset((paginacion.pagina - 1) * limite)

  return {
    estado: "ok",
    hayMas: paginacion.pagina < paginacion.paginas,
    paginacion,
    ventas: filas.slice(0, limite).map((f) => ({
      ...f,
      estado: f.estado as EstadoVenta,
      creadoEn: f.creadoEn.toISOString(),
    })),
  }
}

export async function obtenerVenta(db: Ejecutor, ventaId: string): Promise<ResultadoDetalleVenta> {
  // Un ID mal formado no existe: se evita que Postgres lo rechace como error de tipo uuid.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ventaId)) return { estado: "no_encontrada" }
  const [cabecera] = await db.select().from(venta).where(eq(venta.id, ventaId))
  return cabecera ? { estado: "ok", venta: await cargarVenta(db, cabecera) } : { estado: "no_encontrada" }
}

/** Ventas vigentes y anuladas del periodo, por fecha de operacion. Las anuladas no suman al total. */
export async function resumirVentas(db: Ejecutor, filtro: Pick<FiltroVentas, "desde" | "hasta"> = {}): Promise<ResultadoResumenVentas> {
  const rango = evaluarRango(filtro)
  if (!rango.ok) return { estado: "datos_invalidos", errores: rango.errores }

  const filas = await db
    .select({
      estado: venta.estado,
      cantidad: sql<number>`count(*)::int`,
      // Suma exacta en la base (numeric), devuelta como texto para no pasar por Number.
      total: sql<string>`coalesce(sum(${venta.total}), 0)::text`,
    })
    .from(venta)
    .where(and(...condicionesDeFecha(rango.fechas)))
    .groupBy(venta.estado)

  const vigentes = filas.find((f) => f.estado === "CONFIRMADA")
  const anuladas = filas.find((f) => f.estado === "ANULADA")
  return {
    estado: "ok",
    resumen: {
      ...rango.fechas,
      vigentes: {
        cantidad: vigentes?.cantidad ?? 0,
        total: centavosADecimal(decimalACentavos(vigentes?.total ?? "0") ?? BigInt(0)),
      },
      anuladas: { cantidad: anuladas?.cantidad ?? 0 },
    },
  }
}
