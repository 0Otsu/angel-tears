import { sql } from "drizzle-orm"
import { check, date, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth"

// Egresos manuales: sin relacion con Compra ni Inventario. No se editan ni borran.
export const egreso = pgTable("egreso", {
  id: uuid("id").primaryKey().defaultRandom(),
  concepto: text("concepto").notNull(),
  importe: numeric("importe", { precision: 18, scale: 2 }).notNull(),
  fechaOperacion: date("fecha_operacion", { mode: "string" }).notNull(),
  nota: text("nota"),
  estado: text("estado").notNull().default("CONFIRMADO"),
  actorId: text("actor_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  claveSolicitud: uuid("clave_solicitud").notNull().unique("egreso_clave_solicitud_unica"),
  huella: text("huella").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  anuladoEn: timestamp("anulado_en", { withTimezone: true }),
  anuladoPorId: text("anulado_por_id").references(() => user.id, { onDelete: "restrict" }),
}, t => [
  index("egreso_estado_fecha_id").on(t.estado, t.fechaOperacion, t.id),
  check("egreso_concepto_requerido", sql`length(btrim(${t.concepto})) > 0`),
  check("egreso_nota_no_vacia", sql`${t.nota} IS NULL OR length(btrim(${t.nota})) > 0`),
  check("egreso_importe_valido", sql`${t.importe} > 0 AND ${t.importe}::text NOT IN ('NaN', 'Infinity', '-Infinity')`),
  check("egreso_estado_valido", sql`${t.estado} IN ('CONFIRMADO', 'ANULADO')`),
  check("egreso_anulacion_coherente", sql`(${t.estado} = 'CONFIRMADO' AND ${t.anuladoEn} IS NULL AND ${t.anuladoPorId} IS NULL)
    OR (${t.estado} = 'ANULADO' AND ${t.anuladoEn} IS NOT NULL AND ${t.anuladoPorId} IS NOT NULL)`),
])
