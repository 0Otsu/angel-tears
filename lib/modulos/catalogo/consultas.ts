import "server-only"
import { and, asc, eq, gt, ne, sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { z } from "zod"
import { producto, categoria } from "@/lib/infraestructura/esquemas/producto"
import { inventario } from "@/lib/infraestructura/esquemas/inventario"
import { CODIGOS_CATEGORIA } from "@/lib/modulos/productos/categorias"
import type { ProductoPublico } from "./contrato"

const camposPublicos = {
  id: producto.id, slug: producto.slug, nombre: producto.nombre, precio: producto.precio,
  categoriaCodigo: producto.categoriaCodigo, categoriaNombre: categoria.nombre,
  descripcion: producto.descripcion, material: producto.material, medida: producto.medida,
  color: producto.color, cuidados: producto.cuidados, destacado: producto.destacado,
  disponible: sql<boolean>`${inventario.cantidad} > 0`,
  imagenUrl: producto.imagenUrlSegura, imagenAncho: producto.imagenAncho, imagenAlto: producto.imagenAlto,
}
const esquemaFiltro = z.object({
  categoriaCodigo: z.enum(CODIGOS_CATEGORIA).optional(),
  destacados: z.boolean().optional(),
  excluirId: z.uuid().optional(),
  limite: z.number().int().min(1).max(100).optional(),
}).strict()

type FilaPublica = Omit<ProductoPublico, "moneda" | "imagen"> & {
  imagenUrl: string | null; imagenAncho: number | null; imagenAlto: number | null;
}

function proyectar(fila: FilaPublica): ProductoPublico {
  const { imagenUrl, imagenAncho, imagenAlto, ...datos } = fila
  let imagen: ProductoPublico["imagen"] = null
  if (imagenUrl && imagenAncho && imagenAlto) {
    const url = new URL(imagenUrl)
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Referencia publica de imagen invalida")
    imagen = { url: url.href, ancho: imagenAncho, alto: imagenAlto, alt: `${fila.nombre}, ${fila.categoriaNombre} de Angel Tears` }
  }
  return { ...datos, moneda: "ARS", imagen }
}

/** JOIN de solo lectura autorizado por blueprint seccion 6; no escribe Inventario ni duplica stock. */
export function crearConsultasCatalogo(db: NodePgDatabase) {
  const base = () => db.select(camposPublicos).from(producto)
    .innerJoin(categoria, eq(categoria.codigo, producto.categoriaCodigo))
    .innerJoin(inventario, eq(inventario.productoId, producto.id))

  async function listar(entrada: z.input<typeof esquemaFiltro> = {}): Promise<ProductoPublico[]> {
    const filtro = esquemaFiltro.parse(entrada)
    const condiciones = [eq(producto.publicado, true), gt(inventario.cantidad, 0)]
    if (filtro.categoriaCodigo) condiciones.push(eq(producto.categoriaCodigo, filtro.categoriaCodigo))
    if (filtro.destacados) condiciones.push(eq(producto.destacado, true))
    if (filtro.excluirId) condiciones.push(ne(producto.id, filtro.excluirId))
    const consulta = base().where(and(...condiciones)).orderBy(asc(producto.id)).$dynamic()
    const filas = await (filtro.limite ? consulta.limit(filtro.limite) : consulta)
    return filas.map(proyectar)
  }

  async function consultarPorSlug(slug: string): Promise<ProductoPublico | null> {
    const [fila] = await base().where(and(eq(producto.publicado, true), eq(producto.slug, slug))).limit(1)
    return fila ? proyectar(fila) : null
  }

  async function listarIndexables() {
    return db.select({ slug: producto.slug, modificadoEn: sql<Date>`greatest(${producto.actualizadoEn}, ${inventario.actualizadoEn})`.mapWith(producto.actualizadoEn) })
      .from(producto).innerJoin(inventario, eq(inventario.productoId, producto.id))
      .where(eq(producto.publicado, true)).orderBy(asc(producto.id))
  }

  return { listar, consultarPorSlug, listarIndexables }
}
