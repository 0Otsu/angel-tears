import { sql } from "drizzle-orm"
import { boolean, check, integer, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { producto } from "./producto"

export const productoMedia = pgTable("producto_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  productoId: uuid("producto_id").notNull().references(() => producto.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull().default("imagen"),
  orden: integer("orden").notNull(),
  principal: boolean("principal").notNull().default(false),
  assetId: text("asset_id").notNull(), publicId: text("public_id").notNull(),
  versionProveedor: text("version_proveedor").notNull(), urlSegura: text("url_segura").notNull(),
  ancho: integer("ancho").notNull(), alto: integer("alto").notNull(), formato: text("formato").notNull(),
}, t => [
  uniqueIndex("producto_media_posicion").on(t.productoId, t.orden),
  uniqueIndex("producto_media_principal").on(t.productoId).where(sql`${t.principal}`),
  index("producto_media_recurso").on(t.publicId),
  check("producto_media_cupo", sql`${t.orden} BETWEEN 1 AND 7`),
  check("producto_media_imagen", sql`${t.tipo} = 'imagen' AND ${t.ancho} > 0 AND ${t.alto} > 0 AND ${t.ancho}::bigint * ${t.alto} <= 20000000 AND ${t.formato} IN ('jpeg','png','webp') AND ${t.urlSegura} ~ '^https://' AND length(btrim(${t.assetId})) > 0 AND length(btrim(${t.publicId})) > 0 AND length(btrim(${t.versionProveedor})) > 0`),
])
