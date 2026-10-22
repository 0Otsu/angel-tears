import { sql } from "drizzle-orm"
import { boolean, check, index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import type { CodigoCategoria } from "@/lib/modulos/productos/categorias"

// Unico schema comercial de Producto/Categoria, owner Augusto. No User/actor ni saldo.
// Definicion solamente: no genera/aplica migraciones ni siembra al importar.
export const categoria = pgTable("categoria", {
  codigo: text("codigo").$type<CodigoCategoria>().primaryKey(),
  nombre: text("nombre").notNull(),
}, (tabla) => [check("categoria_nombre_requerido", sql`length(btrim(${tabla.nombre})) > 0`)])

export const producto = pgTable("producto", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique("producto_slug_unico"),
  nombre: text("nombre").notNull(),
  precio: numeric("precio", { precision: 18, scale: 2 }).notNull(),
  categoriaCodigo: text("categoria_codigo").$type<CodigoCategoria>().notNull()
    .references(() => categoria.codigo, { onDelete: "restrict" }),
  descripcion: text("descripcion"),
  material: text("material"),
  medida: text("medida"),
  color: text("color"),
  cuidados: text("cuidados"),
  publicado: boolean("publicado").notNull().default(false),
  destacado: boolean("destacado").notNull().default(false),
  version: integer("version").notNull().default(1),
  imagenAssetId: text("imagen_asset_id"),
  imagenPublicId: text("imagen_public_id"),
  imagenVersionProveedor: text("imagen_version_proveedor"),
  imagenUrlSegura: text("imagen_url_segura"),
  imagenAncho: integer("imagen_ancho"),
  imagenAlto: integer("imagen_alto"),
  imagenFormato: text("imagen_formato"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  index("producto_publicado_categoria_id").on(tabla.publicado, tabla.categoriaCodigo, tabla.id),
  check("producto_nombre_requerido", sql`length(btrim(${tabla.nombre})) > 0`),
  check("producto_slug_formato", sql`${tabla.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check("producto_version_positiva", sql`${tabla.version} > 0`),
  // Formato/precision solamente: no imponer restricciones comerciales de cero/signo.
  check("producto_precio_finito", sql`${tabla.precio}::text NOT IN ('NaN', 'Infinity', '-Infinity')`),
  check("producto_imagen_completa", sql`(
    (${tabla.imagenAssetId} IS NULL AND ${tabla.imagenPublicId} IS NULL
      AND ${tabla.imagenVersionProveedor} IS NULL AND ${tabla.imagenUrlSegura} IS NULL
      AND ${tabla.imagenAncho} IS NULL AND ${tabla.imagenAlto} IS NULL AND ${tabla.imagenFormato} IS NULL)
    OR
    (${tabla.imagenAssetId} IS NOT NULL AND length(btrim(${tabla.imagenAssetId})) > 0
      AND ${tabla.imagenPublicId} IS NOT NULL AND length(btrim(${tabla.imagenPublicId})) > 0
      AND ${tabla.imagenVersionProveedor} IS NOT NULL AND length(btrim(${tabla.imagenVersionProveedor})) > 0
      AND ${tabla.imagenUrlSegura} IS NOT NULL AND ${tabla.imagenUrlSegura} ~ '^https://[^/[:space:]]+'
      AND ${tabla.imagenAncho} IS NOT NULL AND ${tabla.imagenAncho} > 0
      AND ${tabla.imagenAlto} IS NOT NULL AND ${tabla.imagenAlto} > 0
      AND ${tabla.imagenFormato} IS NOT NULL AND ${tabla.imagenFormato} IN ('jpeg', 'png', 'webp'))
  )`),
  check("producto_publicado_con_imagen", sql`NOT ${tabla.publicado} OR ${tabla.imagenAssetId} IS NOT NULL`),
])
