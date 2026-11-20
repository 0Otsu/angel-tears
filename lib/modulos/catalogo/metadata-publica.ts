import "server-only"
import type { Metadata } from "next"
import type { ProductoPublico } from "./contrato"
import { leerOrigenIndexable } from "./origen-publico"

export function metadataPublica(titulo: string, descripcion: string, ruta: string, origen = leerOrigenIndexable()): Metadata {
  const url = origen ? new URL(ruta, origen).href : undefined
  const tituloSocial = `${titulo} | Angel Tears`
  const imagenes = origen ? [{ url: `${origen}/icon.png`, width: 512, height: 512, alt: "Angel Tears" }] : []
  return {
    title: titulo, description: descripcion,
    ...(url ? { alternates: { canonical: url } } : { robots: { index: false, follow: false } }),
    openGraph: { title: tituloSocial, description: descripcion, siteName: "Angel Tears", locale: "es_AR", type: "website", ...(url ? { url, images: imagenes } : {}) },
    twitter: { card: "summary", title: tituloSocial, description: descripcion, images: imagenes },
  }
}

export function metadataProducto(producto: ProductoPublico, origen = leerOrigenIndexable(), ciudad?: string): Metadata {
  const descripcion = producto.descripcion || `${producto.nombre}. ${producto.categoriaNombre} de Angel Tears${ciudad ? ` en ${ciudad}` : ""}.`
  const metadata = metadataPublica(producto.nombre, descripcion, `/catalogo/${producto.slug}`, origen)
  if (!producto.imagen) return metadata
  const imagenes = [{ url: producto.imagen.url, width: producto.imagen.ancho, height: producto.imagen.alto, alt: producto.imagen.alt }]
  return { ...metadata, openGraph: { ...metadata.openGraph, images: imagenes }, twitter: { ...metadata.twitter, card: "summary_large_image", images: imagenes } }
}
