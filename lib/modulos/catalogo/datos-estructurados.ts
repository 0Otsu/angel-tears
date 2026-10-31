import "server-only"
import { negocioPublico } from "@/lib/negocio-publico"
import type { ProductoPublico } from "./contrato"
import { leerOrigenPublico } from "./origen-publico"

/** JSON embebido, no HTML ejecutable: tampoco permite cerrar el elemento script. */
export function serializarDatosEstructurados(datos: unknown): string {
  return JSON.stringify(datos).replace(/[<>&\u2028\u2029]/g, (caracter) => `\\u${caracter.charCodeAt(0).toString(16).padStart(4, "0")}`)
}

export function datosProducto(producto: ProductoPublico, origen = leerOrigenPublico()) {
  const url = origen ? new URL(`/catalogo/${producto.slug}`, origen).href : undefined
  return {
    "@context": "https://schema.org", "@type": "Product", name: producto.nombre,
    ...(url ? { url, "@id": `${url}#producto` } : {}),
    ...(producto.descripcion ? { description: producto.descripcion } : {}),
    ...(producto.material ? { material: producto.material } : {}),
    ...(producto.color ? { color: producto.color } : {}),
    category: producto.categoriaNombre,
    ...(producto.imagen ? { image: producto.imagen.url } : {}),
    offers: {
      "@type": "Offer", price: producto.precio, priceCurrency: "ARS",
      availability: producto.disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      ...(url ? { url } : {}),
    },
  }
}

export function datosLocal(origen = leerOrigenPublico()) {
  const [ciudad, provincia] = negocioPublico.ciudad.split(", ")
  return {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: "Angel Tears",
    ...(origen ? { url: `${origen}/` } : {}),
    telephone: negocioPublico.telefonoWhatsApp,
    sameAs: [negocioPublico.instagram],
    address: { "@type": "PostalAddress", streetAddress: `${negocioPublico.direccion}, ${negocioPublico.referencia}`, addressLocality: ciudad, addressRegion: provincia, addressCountry: "AR" },
  }
}
