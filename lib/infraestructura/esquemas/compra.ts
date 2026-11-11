// Schema de Compras (blueprint, seccion 5; ADR-003): compra con sus lineas inmutables. Owner:
// Claudio. El saldo vive en Inventario y no se duplica aqui: confirmar una compra pide los
// movimientos de stock a su contrato, y cada linea es el origen de su movimiento
// (movimiento_stock). Dinero numeric(18,2) como string; fecha comercial `date` ISO; timestamps
// timestamptz UTC. Sin limites de importe ni de fecha: ninguno esta aprobado (pendiente).
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
import { proveedor } from "@/lib/infraestructura/esquemas/proveedor"

const fecha = (nombre: string) => timestamp(nombre, { withTimezone: true })
const importe = (nombre: string) => numeric(nombre, { precision: 18, scale: 2 })

export const compra = pgTable(
  "compra",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Fecha real de la compra (la que usan Finanzas y los filtros); la de carga es `creadoEn`.
    fechaOperacion: date("fecha_operacion", { mode: "string" }).notNull(),
    // Proveedor opcional: una compra sin proveedor no exige uno ficticio. Si hay proveedor, se
    // conserva tambien su nombre del momento (el proveedor puede renombrarse o inactivarse).
    proveedorId: uuid("proveedor_id").references(() => proveedor.id, { onDelete: "restrict" }),
    nombreProveedorHistorico: text("nombre_proveedor_historico"),
    nota: text("nota"),
    total: importe("total").notNull(),
    estado: text("estado").notNull().default("CONFIRMADA"),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // Identifica la operacion logica (no un intento de red); con la huella evita el doble efecto.
    claveSolicitud: uuid("clave_solicitud").notNull().unique("compra_clave_solicitud_unica"),
    huella: text("huella").notNull(),
    creadoEn: fecha("creado_en").notNull().defaultNow(),
    anuladoEn: fecha("anulado_en"),
    anuladoPorId: text("anulado_por_id").references(() => user.id, { onDelete: "restrict" }),
  },
  (tabla) => [
    index("compra_estado_fecha_id").on(tabla.estado, tabla.fechaOperacion, tabla.id),
    index("compra_proveedor").on(tabla.proveedorId),
    check("compra_estado_valido", sql`${tabla.estado} IN ('CONFIRMADA', 'ANULADA')`),
    check(
      "compra_anulacion_coherente",
      sql`(${tabla.estado} = 'ANULADA' AND ${tabla.anuladoEn} IS NOT NULL AND ${tabla.anuladoPorId} IS NOT NULL)
        OR (${tabla.estado} = 'CONFIRMADA' AND ${tabla.anuladoEn} IS NULL AND ${tabla.anuladoPorId} IS NULL)`,
    ),
    check(
      "compra_proveedor_coherente",
      sql`(${tabla.proveedorId} IS NULL) = (${tabla.nombreProveedorHistorico} IS NULL)`,
    ),
    check("compra_nota_no_vacia", sql`${tabla.nota} IS NULL OR length(btrim(${tabla.nota})) > 0`),
    check(
      "compra_total_valido",
      sql`${tabla.total} >= 0 AND ${tabla.total}::text NOT IN ('NaN', 'Infinity', '-Infinity')`,
    ),
  ],
)

// Linea inmutable: conserva el nombre del producto y el costo del momento de la compra (E1); un
// cambio posterior del Producto no la reescribe. "Al menos una linea" lo garantiza el servicio
// dentro de la misma transaccion que inserta la cabecera.
export const compraLinea = pgTable(
  "compra_linea",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    compraId: uuid("compra_id")
      .notNull()
      .references(() => compra.id, { onDelete: "restrict" }),
    numeroLinea: integer("numero_linea").notNull(),
    productoId: uuid("producto_id")
      .notNull()
      .references(() => producto.id, { onDelete: "restrict" }),
    nombreProductoHistorico: text("nombre_producto_historico").notNull(),
    cantidad: integer("cantidad").notNull(),
    costoUnitarioHistorico: importe("costo_unitario_historico").notNull(),
    subtotal: importe("subtotal").notNull(),
  },
  (tabla) => [
    unique("compra_linea_compra_numero_unico").on(tabla.compraId, tabla.numeroLinea),
    index("compra_linea_producto").on(tabla.productoId),
    check("compra_linea_numero_positivo", sql`${tabla.numeroLinea} > 0`),
    check("compra_linea_cantidad_positiva", sql`${tabla.cantidad} > 0`),
    check("compra_linea_nombre_requerido", sql`length(btrim(${tabla.nombreProductoHistorico})) > 0`),
    check(
      "compra_linea_costo_valido",
      sql`${tabla.costoUnitarioHistorico} >= 0 AND ${tabla.costoUnitarioHistorico}::text NOT IN ('NaN', 'Infinity', '-Infinity')`,
    ),
    check(
      "compra_linea_subtotal_exacto",
      sql`${tabla.subtotal} = ${tabla.cantidad} * ${tabla.costoUnitarioHistorico}`,
    ),
  ],
)
