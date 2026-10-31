import "server-only"
import type { Metadata } from "next"
import type { ProductoPublico } from "./contrato"
import { leerOrigenPublico } from "./origen-publico"

export function metadataPublica(titulo: string, descripcion: string, ruta: string, origen = leerOrigenPublico()): Metadata {
  const url = origen ? new URL(ruta, origen).href : undefined
  return {
    title: titulo, description: descripcion,
    ...(url ? { alternates: { canonical: url } } : { robots: { index: false, follow: false } }),
    openGraph: { title: `${titulo} | Angel Tears`, description: descripcion, siteName: "Angel Tears", locale: "es_AR", type: "website", ...(url ? { url } : {}) },
  }
}

export function metadataProducto(producto: ProductoPublico, origen = leerOrigenPublico()): Metadata {
  const descripcion = producto.descripcion || `${producto.nombre}. ${producto.categoriaNombre} de Angel Tears en Concordia.`
  const metadata = metadataPublica(producto.nombre, descripcion, `/catalogo/${producto.slug}`, origen)
  const imagenes = producto.imagen ? [{ url: producto.imagen.url, width: producto.imagen.ancho, height: producto.imagen.alto, alt: producto.imagen.alt }] : []
  return { ...metadata, openGraph: { ...metadata.openGraph, images: imagenes }, twitter: { card: "summary_large_image", title: producto.nombre, description: descripcion, images: imagenes } }
}
