import { validarPaginacion, paginar } from "@/lib/paginacion"
import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { compra, compraLinea } from "@/lib/infraestructura/esquemas/compra"
import type {
  CompraDetalle,
  EstadoCompra,
  FiltroCompras,
  ResultadoDetalleCompra,
  ResultadoListadoCompras,
  ResultadoResumenCompras,
} from "@/lib/modulos/compras/contrato"
import { centavosADecimal, decimalACentavos } from "@/lib/modulos/compras/dinero"
import { esFechaOperacionValida } from "@/lib/modulos/compras/reglas-compra"

// Consultas de Compras (tarea 4.1 y 4.5): listado y detalle por fecha de operacion y estado, y el
// resumen de compras vigentes que consumen Dashboard y Finanzas. Solo lectura y sin sesion: cada
// Action debe exigir la Administradora antes de llamarlas.

export type Ejecutor = Pick<NodePgDatabase, "select">

const ESTADOS: readonly EstadoCompra[] = ["CONFIRMADA", "ANULADA"]

export async function cargarCompra(ejecutor: Ejecutor, cabecera: typeof compra.$inferSelect): Promise<CompraDetalle> {
  const lineas = await ejecutor
    .select()
    .from(compraLinea)
    .where(eq(compraLinea.compraId, cabecera.id))
    .orderBy(asc(compraLinea.numeroLinea))
  return {
    id: cabecera.id,
    fechaOperacion: cabecera.fechaOperacion,
    proveedorId: cabecera.proveedorId,
    nombreProveedor: cabecera.nombreProveedorHistorico,
    nota: cabecera.nota,
    total: cabecera.total,
    estado: cabecera.estado as EstadoCompra,
    creadoEn: cabecera.creadoEn.toISOString(),
    anuladoEn: cabecera.anuladoEn?.toISOString() ?? null,
    lineas: lineas.map((l) => ({
      numeroLinea: l.numeroLinea,
      productoId: l.productoId,
      nombreProducto: l.nombreProductoHistorico,
      cantidad: l.cantidad,
      costoUnitario: l.costoUnitarioHistorico,
      subtotal: l.subtotal,
    })),
  }
}

function vacio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === ""
}

type Fechas = { desde: string | null; hasta: string | null }

function evaluarRango(filtro: FiltroCompras): { ok: true; fechas: Fechas } | { ok: false; errores: { desde?: string; hasta?: string } } {
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
    ...(desde ? [gte(compra.fechaOperacion, desde)] : []),
    ...(hasta ? [lte(compra.fechaOperacion, hasta)] : []),
  ]
}

/** Mas recientes primero por fecha de operacion (no por fecha de carga). Incluye las anuladas. */
export async function listarCompras(db: Ejecutor, filtro: FiltroCompras = {}): Promise<ResultadoListadoCompras> {
  const errores: Partial<Record<"estado" | "desde" | "hasta" | "limite" | "pagina", string>> = {}
  const rango = evaluarRango(filtro)
  if (!rango.ok) Object.assign(errores, rango.errores)
  if (!vacio(filtro.estado) && !ESTADOS.includes(filtro.estado as EstadoCompra)) errores.estado = "Elegí un estado válido."
  const entrada = validarPaginacion(filtro)
  if (!entrada.success) for (const e of entrada.error.issues) errores[e.path[0] as "pagina" | "limite"] = e.message
  if (!rango.ok || !entrada.success || Object.keys(errores).length) return { estado: "datos_invalidos", errores }
  const { limite, pagina } = entrada.data
  const condiciones = [
    ...condicionesDeFecha(rango.fechas),
    ...(vacio(filtro.estado) ? [] : [eq(compra.estado, filtro.estado as EstadoCompra)]),
  ]
  const [conteo] = await db.select({ total: sql<number>`count(*)::int` }).from(compra).where(and(...condiciones))
  const paginacion = paginar(conteo.total, pagina, limite)
  const filas = await db
    .select({
      id: compra.id,
      fechaOperacion: compra.fechaOperacion,
      nombreProveedor: compra.nombreProveedorHistorico,
      total: compra.total,
      estado: compra.estado,
      creadoEn: compra.creadoEn,
      // Calificado a mano: en un select de una sola tabla Drizzle omite el nombre de tabla de las
      // columnas, y el subselect compararia compra_linea consigo misma.
      cantidadLineas: sql<number>`(select count(*)::int from "compra_linea" as "l" where "l"."compra_id" = "compra"."id")`,
    })
    .from(compra)
    .where(and(...condiciones))
    .orderBy(desc(compra.fechaOperacion), desc(compra.id))
    // Solo se transfieren las filas de la pagina; el total se calcula en PostgreSQL.
    .limit(limite).offset((paginacion.pagina - 1) * limite)

  return {
    estado: "ok",
    hayMas: paginacion.pagina < paginacion.paginas,
    paginacion,
    compras: filas.slice(0, limite).map((f) => ({
      ...f,
      estado: f.estado as EstadoCompra,
      creadoEn: f.creadoEn.toISOString(),
    })),
  }
}

export async function obtenerCompra(db: Ejecutor, compraId: string): Promise<ResultadoDetalleCompra> {
  // Un ID mal formado no existe: se evita que Postgres lo rechace como error de tipo uuid.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(compraId)) return { estado: "no_encontrada" }
  const [cabecera] = await db.select().from(compra).where(eq(compra.id, compraId))
  return cabecera ? { estado: "ok", compra: await cargarCompra(db, cabecera) } : { estado: "no_encontrada" }
}

/** Compras vigentes y anuladas del periodo, por fecha de operacion. Las anuladas no suman al total. */
export async function resumirCompras(db: Ejecutor, filtro: Pick<FiltroCompras, "desde" | "hasta"> = {}): Promise<ResultadoResumenCompras> {
  const rango = evaluarRango(filtro)
  if (!rango.ok) return { estado: "datos_invalidos", errores: rango.errores }

  const filas = await db
    .select({
      estado: compra.estado,
      cantidad: sql<number>`count(*)::int`,
      // Suma exacta en la base (numeric), devuelta como texto para no pasar por Number.
      total: sql<string>`coalesce(sum(${compra.total}), 0)::text`,
    })
    .from(compra)
    .where(and(...condicionesDeFecha(rango.fechas)))
    .groupBy(compra.estado)

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
