import "server-only"
import { and, desc, eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { egreso } from "@/lib/infraestructura/esquemas/egreso"
import { conAdministradora, type ExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { calcularHuellaSolicitud } from "@/lib/modulos/inventario/solicitud"
import { condicionesFecha, resumirEgresos } from "./lectura"
import { entradaEgreso, erroresPorCampo, filtroEgresos } from "./validacion"
import type { EgresoDetalle, FiltroEgresos, ResultadoRegistro, ResultadoAnulacion, ResultadoDetalle, ResultadoListado, ResultadoResumen } from "./contrato"

function detalle(f: typeof egreso.$inferSelect): EgresoDetalle {
  return { id: f.id, concepto: f.concepto, importe: f.importe, moneda: "ARS", fechaOperacion: f.fechaOperacion,
    nota: f.nota, estado: f.estado as EgresoDetalle["estado"], creadoEn: f.creadoEn.toISOString(), anuladoEn: f.anuladoEn?.toISOString() ?? null }
}

export function crearAdministracionEgresos({ db, exigir }: { db: NodePgDatabase; exigir: ExigirAdministradora }) {
  async function registrar(headers: Headers, entrada: unknown): Promise<ResultadoRegistro> {
    const autorizado = await conAdministradora(exigir, headers, async (actor): Promise<ResultadoRegistro> => {
      const p = entradaEgreso.safeParse(entrada)
      if (!p.success) return { estado: "datos_invalidos", errores: erroresPorCampo(p.error) }
      const { claveSolicitud, ...contenido } = p.data
      const huella = calcularHuellaSolicitud(contenido)
      return db.transaction(async tx => {
        const [nuevo] = await tx.insert(egreso).values({ ...contenido, claveSolicitud, huella, actorId: actor.id })
          .onConflictDoNothing({ target: egreso.claveSolicitud }).returning()
        if (nuevo) return { estado: "ok", egreso: detalle(nuevo), repetido: false }
        // Unique arbitra confirmaciones concurrentes; tras esperar vemos el registro confirmado.
        const [previo] = await tx.select().from(egreso).where(eq(egreso.claveSolicitud, claveSolicitud))
        if (previo.huella !== huella) return { estado: "conflicto_solicitud" }
        return { estado: "ok", egreso: detalle(previo), repetido: true }
      })
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }
  async function anular(headers: Headers, id: unknown): Promise<ResultadoAnulacion> {
    const autorizado = await conAdministradora(exigir, headers, async (actor): Promise<ResultadoAnulacion> => {
      const p = z.uuid().safeParse(id)
      if (!p.success) return { estado: "no_encontrado" }
      return db.transaction(async tx => {
        const [fila] = await tx.select().from(egreso).where(eq(egreso.id, p.data)).for("update")
        if (!fila) return { estado: "no_encontrado" }
        if (fila.estado === "ANULADO") return { estado: "ya_anulado", egreso: detalle(fila) }
        const [anulado] = await tx.update(egreso).set({ estado: "ANULADO", anuladoEn: new Date(), anuladoPorId: actor.id }).where(eq(egreso.id, fila.id)).returning()
        return { estado: "ok", egreso: detalle(anulado) }
      })
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }
  async function obtenerDetalle(headers: Headers, id: unknown): Promise<ResultadoDetalle> {
    const autorizado = await conAdministradora(exigir, headers, async (): Promise<ResultadoDetalle> => {
      const p = z.uuid().safeParse(id)
      if (!p.success) return { estado: "no_encontrado" }
      const [fila] = await db.select().from(egreso).where(eq(egreso.id, p.data))
      return fila ? { estado: "ok", egreso: detalle(fila) } : { estado: "no_encontrado" }
    })
    return autorizado.estado === "sesion_requerida" ? autorizado : autorizado.valor
  }
  async function listar(headers: Headers, filtro: FiltroEgresos = {}): Promise<ResultadoListado> {
    await exigir(headers)
    const p = filtroEgresos.safeParse(filtro)
    if (!p.success) return { estado: "datos_invalidos", errores: erroresPorCampo(p.error) }
    const f = p.data
    const filas = await db.select().from(egreso).where(and(...condicionesFecha(f), ...(f.estado ? [eq(egreso.estado, f.estado)] : [])))
      .orderBy(desc(egreso.fechaOperacion), desc(egreso.creadoEn), desc(egreso.id)).limit(f.limite + 1)
    return { estado: "ok", egresos: filas.slice(0, f.limite).map(detalle), hayMas: filas.length > f.limite }
  }
  async function resumir(headers: Headers, filtro: Pick<FiltroEgresos, "desde" | "hasta"> = {}): Promise<ResultadoResumen> {
    await exigir(headers)
    return resumirEgresos(db, filtro)
  }
  return { registrar, anular, detalle: obtenerDetalle, listar, resumir }
}
