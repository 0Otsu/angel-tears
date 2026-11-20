import { and, lt, lte, or, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { cuotaRecuperacion } from "./esquemas/cuota-recuperacion"

const INTENTOS_POR_DIA_UTC = 12
const MINUTOS_ENTRE_INTENTOS = 5

/** Reserva el intento antes de hablar con Resend. Un fallo de entrega también ocupa su lugar. */
export async function reservarIntentoRecuperacion(db: NodePgDatabase): Promise<boolean> {
  const ahora = sql`statement_timestamp()`
  const diaUtc = sql`(${ahora} AT TIME ZONE 'UTC')::date`
  const [reserva] = await db.insert(cuotaRecuperacion)
    .values({ id: 1, diaUtc, intentos: 1, ultimoIntento: ahora })
    .onConflictDoUpdate({
      target: cuotaRecuperacion.id,
      set: {
        diaUtc,
        intentos: sql`CASE WHEN ${cuotaRecuperacion.diaUtc} = ${diaUtc} THEN ${cuotaRecuperacion.intentos} + 1 ELSE 1 END`,
        ultimoIntento: ahora,
      },
      // PostgreSQL serializa el conflicto de esta fila y vuelve a evaluar las condiciones.
      setWhere: and(
        lte(cuotaRecuperacion.ultimoIntento, sql`${ahora} - ${MINUTOS_ENTRE_INTENTOS} * interval '1 minute'`),
        or(lt(cuotaRecuperacion.diaUtc, diaUtc), lt(cuotaRecuperacion.intentos, INTENTOS_POR_DIA_UTC)),
      ),
    })
    .returning({ id: cuotaRecuperacion.id })
  return Boolean(reserva)
}
