// Schema de Ventas (blueprint, seccion 5; ADR-003): venta con sus lineas inmutables. Owner: Emi.
// El saldo vive en Inventario y no se duplica aqui: confirmar una venta pide los movimientos
// de stock a su contrato, y cada linea es el origen de su movimiento (movimiento_stock).
// Dinero numeric(18,2) como string; fecha comercial `date` ISO; timestamps timestamptz UTC.
import { sql } from "drizzle-orm"
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "@/lib/infraestructura/esquemas/auth"
import { producto } from "@/lib/infraestructura/esquemas/producto"

const fecha = (nombre: string) => timestamp(nombre, { withTimezone: true })
const importe = (nombre: string) => numeric(nombre, { precision: 18, scale: 2 })

export const venta = pgTable(
  "venta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Fecha real de la venta (la que usan Finanzas y los filtros); la de carga es `creadoEn`.
    fechaOperacion: date("fecha_operacion", { mode: "string" }).notNull(),
    // Comprador opcional y sin entidad Cliente (F2): null se presenta como Consumidor Final.
    comprador: text("comprador"),
    total: importe("total").notNull(),
    estado: text("estado").notNull().default("CONFIRMADA"),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // Identifica la operacion logica (no un intento de red); con la huella evita el doble efecto.
    claveSolicitud: uuid("clave_solicitud").notNull().unique("venta_clave_solicitud_unica"),
    huella: text("huella").notNull(),
    creadoEn: fecha("creado_en").notNull().defaultNow(),
    anuladoEn: fecha("anulado_en"),
    anuladoPorId: text("anulado_por_id").references(() => user.id, { onDelete: "restrict" }),
  },
  (tabla) => [
    index("venta_estado_fecha_id").on(tabla.estado, tabla.fechaOperacion, tabla.id),
    check("venta_estado_valido", sql`${tabla.estado} IN ('CONFIRMADA', 'ANULADA')`),
    check(
      "venta_anulacion_coherente",
      sql`(${tabla.estado} = 'ANULADA' AND ${tabla.anuladoEn} IS NOT NULL AND ${tabla.anuladoPorId} IS NOT NULL)
        OR (${tabla.estado} = 'CONFIRMADA' AND ${tabla.anuladoEn} IS NULL AND ${tabla.anuladoPorId} IS NULL)`,
    ),
    check("venta_comprador_no_vacio", sql`${tabla.comprador} IS NULL OR length(btrim(${tabla.comprador})) > 0`),
    check(
      "venta_total_valido",
      sql`${tabla.total} >= 0 AND ${tabla.total}::text NOT IN ('NaN', 'Infinity', '-Infinity')`,
    ),
  ],
)

// Linea inmutable: conserva nombre y precio del momento de la venta (F3); un cambio posterior
// del Producto no la reescribe. "Al menos una linea" lo garantiza el servicio dentro de la misma
// transaccion que inserta la cabecera.
export const ventaLinea = pgTable(
  "venta_linea",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventaId: uuid("venta_id")
      .notNull()
      .references(() => venta.id, { onDelete: "restrict" }),
    numeroLinea: integer("numero_linea").notNull(),
    productoId: uuid("producto_id")
      .notNull()
      .references(() => producto.id, { onDelete: "restrict" }),
    nombreProductoHistorico: text("nombre_producto_historico").notNull(),
    cantidad: integer("cantidad").notNull(),
    precioUnitarioHistorico: importe("precio_unitario_historico").notNull(),
    subtotal: importe("subtotal").notNull(),
  },
  (tabla) => [
    unique("venta_linea_venta_numero_unico").on(tabla.ventaId, tabla.numeroLinea),
    index("venta_linea_producto").on(tabla.productoId),
    check("venta_linea_numero_positivo", sql`${tabla.numeroLinea} > 0`),
    check("venta_linea_cantidad_positiva", sql`${tabla.cantidad} > 0`),
    check("venta_linea_nombre_requerido", sql`length(btrim(${tabla.nombreProductoHistorico})) > 0`),
    check(
      "venta_linea_precio_valido",
      sql`${tabla.precioUnitarioHistorico} >= 0 AND ${tabla.precioUnitarioHistorico}::text NOT IN ('NaN', 'Infinity', '-Infinity')`,
    ),
    check(
      "venta_linea_subtotal_exacto",
      sql`${tabla.subtotal} = ${tabla.cantidad} * ${tabla.precioUnitarioHistorico}`,
    ),
  ],
)
