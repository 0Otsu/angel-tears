import "server-only"
import type { NegocioPublico } from "@/lib/negocio-publico"
import type { ProductoPublico } from "./contrato"
import { leerOrigenIndexable } from "./origen-publico"

/** JSON embebido, no HTML ejecutable: tampoco permite cerrar el elemento script. */
export function serializarDatosEstructurados(datos: unknown): string {
  return JSON.stringify(datos).replace(/[<>&\u2028\u2029]/g, (caracter) => `\\u${caracter.charCodeAt(0).toString(16).padStart(4, "0")}`)
}

export function datosProducto(producto: ProductoPublico, origen = leerOrigenIndexable()) {
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
      "@type": "Offer", price: producto.precio, priceCurrency: producto.moneda,
      availability: producto.disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      ...(url ? { url } : {}),
    },
  }
}

const diasSchema = {
  lunes: "Monday", martes: "Tuesday", miercoles: "Wednesday", jueves: "Thursday",
  viernes: "Friday", sabado: "Saturday", domingo: "Sunday",
}

export function datosLocal(negocioPublico: NegocioPublico, origen = leerOrigenIndexable()) {
  return {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: "Angel Tears",
    ...(origen ? { url: `${origen}/` } : {}),
    telephone: negocioPublico.telefonoWhatsApp,
    sameAs: [negocioPublico.instagram],
    hasMap: negocioPublico.comoLlegar,
    address: {
      "@type": "PostalAddress",
      streetAddress: [negocioPublico.direccion, negocioPublico.referencia].filter(Boolean).join(", "),
      addressLocality: negocioPublico.localidad,
      addressRegion: negocioPublico.provincia,
      addressCountry: "AR",
    },
    openingHoursSpecification: negocioPublico.gruposHorarios.flatMap(({ dias, franjas }) => {
      const dayOfWeek = dias.map(dia => `https://schema.org/${diasSchema[dia]}`)
      const intervalos = franjas.length ? franjas : [{ apertura: "00:00", cierre: "00:00" }]
      return intervalos.map(({ apertura, cierre }) => ({
        "@type": "OpeningHoursSpecification", dayOfWeek, opens: `${apertura}:00`, closes: `${cierre}:00`,
      }))
    }),
  }
}
