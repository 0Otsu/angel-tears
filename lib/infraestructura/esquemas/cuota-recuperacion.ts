import { sql } from "drizzle-orm"
import { check, date, integer, pgTable, smallint, timestamp } from "drizzle-orm/pg-core"

// Una fila global por base. Better Auth administra y purga su tabla rate_limit por separado.
export const cuotaRecuperacion = pgTable("cuota_recuperacion", {
  id: smallint("id").primaryKey(),
  diaUtc: date("dia_utc").notNull(),
  intentos: integer("intentos").notNull(),
  ultimoIntento: timestamp("ultimo_intento", { withTimezone: true }).notNull(),
}, tabla => [
  check("cuota_recuperacion_fila_unica", sql`${tabla.id} = 1`),
  check("cuota_recuperacion_intentos_positivos", sql`${tabla.intentos} > 0`),
])
