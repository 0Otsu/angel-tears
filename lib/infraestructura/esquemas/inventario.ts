// Schema de Inventario (blueprint, seccion 5): saldo por Producto, ajustes manuales y movimientos
// append-only. Owner: Claudio. El saldo vive aqui y no en Producto. Solo cubre el origen
// "ajuste": la columna/FK de origen de CompraLinea llega junto con Compra/CompraLinea y la de
// VentaLinea en la Ronda 2 (blueprint, seccion 12); no se adelantan tablas.
import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { user } from "@/lib/infraestructura/esquemas/auth"
import { producto } from "@/lib/infraestructura/esquemas/producto"

const fecha = (nombre: string) => timestamp(nombre, { withTimezone: true })

export const inventario = pgTable(
  "inventario",
  {
    // 1:1 con Producto: la PK impide un saldo duplicado.
    productoId: uuid("producto_id")
      .primaryKey()
      .references(() => producto.id, { onDelete: "restrict" }),
    cantidad: integer("cantidad").notNull().default(0),
    // null = sin minimo (sin alerta); cero es un minimo real.
    minimo: integer("minimo"),
    version: integer("version").notNull().default(1),
    actualizadoEn: fecha("actualizado_en").notNull().defaultNow(),
  },
  (tabla) => [
    check("inventario_cantidad_no_negativa", sql`${tabla.cantidad} >= 0`),
    check("inventario_minimo_no_negativo", sql`${tabla.minimo} IS NULL OR ${tabla.minimo} >= 0`),
  ],
)

export const ajusteStock = pgTable(
  "ajuste_stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productoId: uuid("producto_id")
      .notNull()
      .references(() => producto.id, { onDelete: "restrict" }),
    tipo: text("tipo").notNull(),
    cantidad: integer("cantidad").notNull(),
    motivo: text("motivo").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // Identifica la operacion logica (no un intento de red); con la huella evita el doble efecto.
    claveSolicitud: uuid("clave_solicitud").notNull().unique("ajuste_stock_clave_solicitud_unica"),
    huella: text("huella").notNull(),
    creadoEn: fecha("creado_en").notNull().defaultNow(),
  },
  (tabla) => [
    index("ajuste_stock_producto_creado_id").on(tabla.productoId, tabla.creadoEn, tabla.id),
    check("ajuste_stock_tipo_valido", sql`${tabla.tipo} IN ('INICIAL', 'INCREMENTO', 'DECREMENTO')`),
    check("ajuste_stock_cantidad_positiva", sql`${tabla.cantidad} > 0`),
    check("ajuste_stock_motivo_requerido", sql`length(btrim(${tabla.motivo})) > 0`),
  ],
)

export const movimientoStock = pgTable(
  "movimiento_stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productoId: uuid("producto_id")
      .notNull()
      .references(() => producto.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    saldoResultante: integer("saldo_resultante").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    tipo: text("tipo").notNull().default("ORIGINAL"),
    // Origen del movimiento. Hoy solo ajuste; los demas origenes se suman con su tabla y se
    // amplia el CHECK de "exactamente un origen" en esa misma migracion.
    ajusteId: uuid("ajuste_id").references(() => ajusteStock.id, { onDelete: "restrict" }),
    // Una reversa apunta al movimiento que revierte, y cada movimiento se revierte una sola vez.
    reversaDe: uuid("reversa_de")
      .references((): AnyPgColumn => movimientoStock.id, { onDelete: "restrict" })
      .unique("movimiento_stock_reversa_de_unica"),
    creadoEn: fecha("creado_en").notNull().defaultNow(),
  },
  (tabla) => [
    index("movimiento_stock_producto_creado_id").on(tabla.productoId, tabla.creadoEn, tabla.id),
    uniqueIndex("movimiento_stock_ajuste_tipo_unico")
      .on(tabla.ajusteId, tabla.tipo)
      .where(sql`${tabla.ajusteId} IS NOT NULL`),
    check("movimiento_stock_delta_no_cero", sql`${tabla.delta} <> 0`),
    check("movimiento_stock_saldo_no_negativo", sql`${tabla.saldoResultante} >= 0`),
    check("movimiento_stock_tipo_valido", sql`${tabla.tipo} IN ('ORIGINAL', 'REVERSA')`),
    check("movimiento_stock_origen_unico", sql`num_nonnulls(${tabla.ajusteId}) = 1`),
    check(
      "movimiento_stock_reversa_coherente",
      sql`(${tabla.tipo} = 'REVERSA') = (${tabla.reversaDe} IS NOT NULL)`,
    ),
  ],
)
