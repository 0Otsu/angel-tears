import "server-only"
import { and, desc, eq, gte, lte, sql } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { venta } from "@/lib/infraestructura/esquemas/venta"
import { compra } from "@/lib/infraestructura/esquemas/compra"
import { egreso } from "@/lib/infraestructura/esquemas/egreso"
import { resumirVentas } from "@/lib/modulos/ventas/lectura"
import { resumirCompras } from "@/lib/modulos/compras/lectura"
import { resumirEgresos } from "@/lib/modulos/egresos/lectura"
import { FUENTES, type Fuente, type LeerFinanzas, type LecturaFuente, type PeriodoFinanzas } from "./contrato"
import { fuentesNoDisponibles } from "./agregacion"

type Ejecutor = Pick<NodePgDatabase, "select">
const fuentes = {
  ventas: { tabla: venta, importe: venta.total, vigente: "CONFIRMADA", resumir: (db: Ejecutor, p: PeriodoFinanzas) => resumirVentas(db, p) },
  compras: { tabla: compra, importe: compra.total, vigente: "CONFIRMADA", resumir: (db: Ejecutor, p: PeriodoFinanzas) => resumirCompras(db, p) },
  egresos: { tabla: egreso, importe: egreso.importe, vigente: "CONFIRMADO", resumir: (db: Ejecutor, p: PeriodoFinanzas) => resumirEgresos(db, p) },
}

async function leerFuente(db: Ejecutor, fuente: Fuente, p: PeriodoFinanzas, detalle: boolean): Promise<LecturaFuente> {
  const config = fuentes[fuente], t = config.tabla
  // Son las mismas consultas/contratos usados por Administracion*.resumir. Se les pasa
  // el ejecutor del corte financiero; nunca se reimplementa su total ni su estado vigente.
  const resumen = await config.resumir(db, p)
  if (resumen.estado !== "ok") throw new Error("Rango de resumen rechazado")
  if (!detalle) return { estado: "ok", resumen: resumen.resumen, evolucion: [], operaciones: [], hayMas: false }
  const fechas = [gte(t.fechaOperacion, p.desde), lte(t.fechaOperacion, p.hasta)]
  const fechaAgrupada = p.agrupacion === "mes" ? sql<string>`to_char(${t.fechaOperacion}, 'YYYY-MM-01')` : sql<string>`${t.fechaOperacion}::text`
  const evolucion = await db.select({ fecha: fechaAgrupada, total: sql<string>`sum(${config.importe})::text` })
    .from(t).where(and(...fechas, eq(t.estado, config.vigente))).groupBy(fechaAgrupada).orderBy(fechaAgrupada)
  if (fuente === "ventas" || (p.tipo !== "todos" && p.tipo !== fuente)) {
    return { estado: "ok", resumen: resumen.resumen, evolucion, operaciones: [], hayMas: false }
  }
  // RF-19: proyección privada, sin comandos ni nueva persistencia. El límite solo afecta
  // la historia visible, nunca los resúmenes o la evolución del período completo.
  const concepto = fuente === "compras"
    ? sql<string>`coalesce(${compra.nombreProveedorHistorico}, 'Compra sin proveedor')`
    : sql<string>`${egreso.concepto}`
  const condiciones = [...fechas]
  if (p.estado !== "todos") condiciones.push(eq(t.estado, p.estado === "vigente" ? config.vigente : fuente === "compras" ? "ANULADA" : "ANULADO"))
  const filas = await db.select({ id: t.id, fecha: t.fechaOperacion, importe: config.importe as AnyPgColumn, estado: t.estado, concepto })
    .from(t).where(and(...condiciones)).orderBy(desc(t.fechaOperacion), t.id).limit(51)
  return { estado: "ok", resumen: resumen.resumen, evolucion, hayMas: filas.length > 50,
    operaciones: filas.slice(0, 50).map(f => ({ id: f.id, fecha: f.fecha, importe: String(f.importe), concepto: f.concepto, tipo: fuente, anulada: f.estado !== config.vigente })) }
}

export function crearLecturaFinanzas(db: NodePgDatabase): LeerFinanzas {
  return (periodo, detalle) => db.transaction(async tx => {
    const resultado = fuentesNoDisponibles()
    for (const fuente of FUENTES) {
      try {
        // Un error SQL aborta su savepoint, no las fuentes sanas del mismo snapshot.
        resultado[fuente] = await tx.transaction(sp => leerFuente(sp, fuente, periodo, detalle))
      } catch {
        console.error("[finanzas] fuente no disponible", { fuente })
      }
    }
    return resultado
  }, { isolationLevel: "repeatable read", accessMode: "read only" })
}
