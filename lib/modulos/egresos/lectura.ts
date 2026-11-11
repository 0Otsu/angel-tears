import "server-only"
import { and, gte, lte, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { egreso } from "@/lib/infraestructura/esquemas/egreso"
import { centavosADecimal, decimalACentavos } from "@/lib/modulos/compras/dinero"
import { erroresPorCampo, filtroEgresos } from "./validacion"
import type { FiltroEgresos, ResultadoResumen } from "./contrato"

export const condicionesFecha = (f: {desde: string | null; hasta: string | null}) => [
  ...(f.desde ? [gte(egreso.fechaOperacion, f.desde)] : []), ...(f.hasta ? [lte(egreso.fechaOperacion, f.hasta)] : []),
]

/** Puerto de lectura interno, como resumirCompras/resumirVentas. El llamador DEBE
 * autorizar previamente. Admite la transaccion del futuro consumidor Finanzas
 * para componer las tres fuentes bajo un corte consistente, sin nuevas consultas.
 */
export async function resumirEgresos(db: Pick<NodePgDatabase, "select">, filtro: Pick<FiltroEgresos, "desde" | "hasta"> = {}): Promise<ResultadoResumen> {
  const p = filtroEgresos.safeParse({ desde: filtro.desde, hasta: filtro.hasta })
  if (!p.success) return { estado: "datos_invalidos", errores: erroresPorCampo(p.error) }
  const filas = await db.select({ estado: egreso.estado, cantidad: sql<number>`count(*)::int`, total: sql<string>`sum(${egreso.importe})::text` })
    .from(egreso).where(and(...condicionesFecha(p.data))).groupBy(egreso.estado)
  const vigente = filas.find(f => f.estado === "CONFIRMADO")
  return { estado: "ok", resumen: { desde: p.data.desde, hasta: p.data.hasta,
    vigentes: { cantidad: vigente?.cantidad ?? 0, total: centavosADecimal(decimalACentavos(vigente?.total ?? "0")!) },
    anuladas: { cantidad: filas.find(f => f.estado === "ANULADO")?.cantidad ?? 0 } } }
}
