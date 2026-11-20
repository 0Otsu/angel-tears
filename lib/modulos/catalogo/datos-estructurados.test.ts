import { proyectarNegocioPublico } from "@/lib/negocio-publico"
import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import { describe, expect, it } from "vitest"
import type { ProductoPublico } from "./contrato"
import { datosLocal, datosProducto, serializarDatosEstructurados } from "./datos-estructurados"

const producto: ProductoPublico = { id: "id", slug: "collar", nombre: "Collar", precio: "90071992547409.93", moneda: "ARS", categoriaCodigo: "collares", categoriaNombre: "Collares", descripcion: null, material: null, medida: null, color: null, cuidados: null, disponible: true, destacado: false, imagen: null }
describe("datos estructurados veraces", () => {
  it("Offer exacto en ARS y disponibilidad derivada del DTO real", () => {
    expect(datosProducto(producto, "https://tienda.example").offers).toEqual({ "@type": "Offer", price: "90071992547409.93", priceCurrency: "ARS", availability: "https://schema.org/InStock", url: "https://tienda.example/catalogo/collar" })
    expect(datosProducto({ ...producto, disponible: false }, null).offers.availability).toBe("https://schema.org/OutOfStock")
    expect(datosProducto(producto, null)).not.toHaveProperty("material")
    expect(datosProducto(producto, null)).not.toHaveProperty("aggregateRating")
    expect(datosProducto(producto, null)).not.toHaveProperty("url")
  })
  it("serializa texto hostil sin script ejecutable y permite recuperar el texto original", () => {
    const texto = '</script><script>globalThis.atacado=true</script>&\u2028\u2029'
    const salida = serializarDatosEstructurados({ name: texto })
    expect(salida).not.toMatch(/[<>&\u2028\u2029]/)
    expect(JSON.parse(salida)).toEqual({ name: texto })
  })
  it("LocalBusiness toma la dirección, horarios y contactos actuales", () => {
    const negocio = proyectarNegocioPublico({ ...configuracionPrueba, direccion: "Local </script> & 5" })
    const local = datosLocal(negocio, null)
    expect(local).toMatchObject({
      name: "Angel Tears",
      address: { streetAddress: "Local </script> & 5, Local 2", addressLocality: "Localidad de prueba", addressRegion: "Entre Ríos", addressCountry: "AR" },
      telephone: "+5491100000000",
      sameAs: ["https://www.instagram.com/accesorios.prueba/"],
      hasMap: configuracionPrueba.comoLlegar,
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification", dayOfWeek: ["https://schema.org/Monday", "https://schema.org/Saturday"],
        opens: "09:30:00", closes: "12:15:00",
      },
    })
    const json = serializarDatosEstructurados(local)
    expect(json).not.toMatch(/[<>&]/)
    expect(JSON.parse(json)).toEqual(local)
    expect(local).not.toHaveProperty("geo")
    expect(local).not.toHaveProperty("url")
  })
})
