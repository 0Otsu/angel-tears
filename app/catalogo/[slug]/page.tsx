import { obtenerNegocioPublico } from "@/lib/modulos/configuracion/aplicacion"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DetalleProducto } from "@/components/publico/detalle-producto"
import { consultarProductoPublico, listarRelacionados } from "@/lib/modulos/catalogo/aplicacion"
import { metadataProducto } from "@/lib/modulos/catalogo/metadata-publica"
import { datosProducto, serializarDatosEstructurados } from "@/lib/modulos/catalogo/datos-estructurados"

export const dynamic = "force-dynamic"

type Propiedades = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: Propiedades): Promise<Metadata> {
  const producto = await consultarProductoPublico((await params).slug)
  if (!producto) return { title: "Producto no encontrado", robots: { index: false, follow: false } }
  return metadataProducto(producto, undefined, (await obtenerNegocioPublico())?.ciudad)
}
export default async function PaginaProducto({ params }: Propiedades) {
  const producto = await consultarProductoPublico((await params).slug)
  if (!producto) notFound()
  const [relacionados, negocioPublico] = await Promise.all([listarRelacionados(producto.id, producto.categoriaCodigo), obtenerNegocioPublico()])
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarDatosEstructurados(datosProducto(producto)) }} />
    <DetalleProducto product={producto} relacionados={relacionados} negocioPublico={negocioPublico} />
  </>
}
