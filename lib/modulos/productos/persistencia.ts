import "server-only"
import { eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"
import type { ConexionBd } from "@/lib/infraestructura/db"
import { categoria, producto } from "@/lib/infraestructura/esquemas/producto"
import type { CrearSaldoCero } from "@/lib/modulos/inventario/contrato"
import { CATEGORIAS_INICIALES } from "@/lib/modulos/productos/categorias"
import type { ProductoInterno } from "@/lib/modulos/productos/contrato"
import { candidatosSlug } from "@/lib/modulos/productos/reglas-producto"
import { esquemaDatosProducto } from "@/lib/modulos/productos/validacion"

type Bd = ConexionBd["db"]
export type TransaccionProducto = Parameters<Parameters<Bd["transaction"]>[0]>[0]

/** Semilla explicita/idempotente en tx del llamador; nunca se ejecuta en build/arranque. */
export async function sembrarCategorias(tx: Pick<TransaccionProducto, "insert">): Promise<void> {
  await tx.insert(categoria).values(CATEGORIAS_INICIALES.map((valor) => ({ ...valor })))
    .onConflictDoNothing({ target: categoria.codigo })
}

/**
 * Preparacion P0, sin endpoint/UI. El llamador autoriza y decide politica comercial antes
 * de abrir UNA tx; propaga cualquier fallo para revertir Producto y saldo juntos.
 * Producto pertenece a Augusto; Inventario/C0 a Claudio. La implementacion persistente es
 * crearContratoInventario(db).crearSaldoCero; recibe esta misma tx, sin abrir otra.
 * No conectar el doble en memoria en runtime. Evidencia conjunta en Inventario SQL.
 */
export async function insertarProductoOcultoConSaldo(
  tx: TransaccionProducto,
  productoId: string,
  entrada: unknown,
  crearSaldoCero: CrearSaldoCero,
): Promise<string> {
  const id = z.uuid().parse(productoId)
  const datos = esquemaDatosProducto.parse(entrada)
  // ON CONFLICT opera bajo la restriccion unica; una lectura previa no evita carreras.
  for (const slug of candidatosSlug(datos.nombre, id)) {
    const insertados = await tx.insert(producto).values({
      ...datos, id, slug, publicado: false, destacado: false,
    }).onConflictDoNothing({ target: producto.slug }).returning({ id: producto.id })
    if (insertados.length === 0) continue
    await crearSaldoCero(tx, id)
    return id
  }
  throw new Error("No se pudo reservar una URL unica para el producto.")
}

/** Una sola consulta, sin filtro de publicado/stock: los ocultos sirven para uso interno. */
export function consultaProductosInternos(bd: Pick<Bd, "select">, ids: readonly string[]) {
  return bd.select({
    id: producto.id,
    nombre: producto.nombre,
    slug: producto.slug,
    categoriaCodigo: producto.categoriaCodigo,
    categoriaNombre: categoria.nombre,
    precio: producto.precio,
    moneda: sql<"ARS">`'ARS'`,
    publicado: producto.publicado,
    imagenValida: sql<boolean>`${producto.imagenAssetId} IS NOT NULL`,
  }).from(producto).innerJoin(categoria, eq(producto.categoriaCodigo, categoria.codigo))
    .where(inArray(producto.id, [...ids])).orderBy(producto.id)
}

export async function leerProductosInternos(bd: Pick<Bd, "select">, ids: readonly string[]): Promise<readonly ProductoInterno[]> {
  if (ids.length === 0) return []
  return consultaProductosInternos(bd, ids)
}
