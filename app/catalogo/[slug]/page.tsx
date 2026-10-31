import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DetalleProducto } from "@/components/publico/detalle-producto"
import { consultarProductoPublico, listarRelacionados } from "@/lib/modulos/catalogo/aplicacion"

export const dynamic = "force-dynamic"

type Propiedades = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: Propiedades): Promise<Metadata> {
  const producto = await consultarProductoPublico((await params).slug)
  if (!producto) return { title: 'Producto no encontrado' }
  return { title: producto.nombre, description: producto.descripcion ?? undefined }
}
export default async function PaginaProducto({ params }: Propiedades) {
  const producto = await consultarProductoPublico((await params).slug)
  if (!producto) notFound()
  return <DetalleProducto product={producto} relacionados={await listarRelacionados(producto.id, producto.categoriaCodigo)} />
}
