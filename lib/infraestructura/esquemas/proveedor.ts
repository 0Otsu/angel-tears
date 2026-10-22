// Schema de Proveedor (blueprint, seccion 5; D1..D4). Owner: Claudio. Solo nombre obligatorio y
// contactos opcionales: sin CUIT ni datos bancarios, y sin unicidad de nombre (no aprobada).
// Un proveedor usado nunca se borra; se inactiva (`activo`) para no ofrecerlo en compras nuevas.
import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

const fecha = (nombre: string) => timestamp(nombre, { withTimezone: true })

export const proveedor = pgTable(
  "proveedor",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    telefono: text("telefono"),
    instagram: text("instagram"),
    nota: text("nota"),
    activo: boolean("activo").notNull().default(true),
    // Evita pisar una edicion hecha desde otra pestana.
    version: integer("version").notNull().default(1),
    creadoEn: fecha("creado_en").notNull().defaultNow(),
    actualizadoEn: fecha("actualizado_en").notNull().defaultNow(),
  },
  (tabla) => [index("proveedor_activo_nombre_id_idx").on(tabla.activo, tabla.nombre, tabla.id)],
)
