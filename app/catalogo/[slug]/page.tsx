import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DetalleProducto } from "@/components/publico/detalle-producto"
import { buscarProductoDemo, productosPublicosDemo } from "@/lib/mock/productos"

type Propiedades = { params: Promise<{ slug: string }> }
export function generateStaticParams() { return productosPublicosDemo.map(producto => ({ slug: producto.id })) }
export async function generateMetadata({ params }: Propiedades): Promise<Metadata> {
  const producto = buscarProductoDemo((await params).slug)
  if (!producto) return { title: 'Producto no encontrado' }
  return { title: producto.name, description: producto.description }
}
export default async function PaginaProducto({ params }: Propiedades) {
  const producto = buscarProductoDemo((await params).slug)
  if (!producto) notFound()
  return <DetalleProducto product={producto} />
}
