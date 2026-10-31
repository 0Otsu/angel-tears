import "server-only"
import { cache } from "react"
import { obtenerDb } from "@/lib/infraestructura/db"
import type { CodigoCategoria } from "@/lib/modulos/productos/categorias"
import { crearConsultasCatalogo } from "./consultas"

// Solo memoizacion por solicitud React: nunca cache persistente de visibilidad/stock.
async function lecturaPublica<T>(leer: () => Promise<T>): Promise<T> {
  try { return await leer() } catch (error) {
    console.error("[catalogo] fallo de lectura", { tipo: error instanceof Error ? error.name : typeof error })
    throw new Error("No fue posible consultar los productos. Intentá nuevamente.")
  }
}
export const consultarProductoPublico = cache((slug: string) => lecturaPublica(() => crearConsultasCatalogo(obtenerDb()).consultarPorSlug(slug)))
export function listarCatalogoPublico() { return lecturaPublica(() => crearConsultasCatalogo(obtenerDb()).listar()) }
export function listarDestacadosPublicos() { return lecturaPublica(() => crearConsultasCatalogo(obtenerDb()).listar({ destacados: true, limite: 4 })) }
export function listarRelacionados(productoId: string, categoriaCodigo: CodigoCategoria) {
  return lecturaPublica(() => crearConsultasCatalogo(obtenerDb()).listar({ categoriaCodigo, excluirId: productoId, limite: 3 }))
}
