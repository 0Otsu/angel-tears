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
  it("LocalBusiness solo datos confirmados sin horarios, coordenadas o reviews", () => {
    const local = datosLocal(null)
    expect(local).toMatchObject({ name: "Angel Tears", address: { streetAddress: "Entre Ríos 924, Planta baja, detrás de las escaleras", addressLocality: "Concordia", addressRegion: "Entre Ríos" } })
    expect(local).not.toHaveProperty("openingHours")
    expect(local).not.toHaveProperty("geo")
    expect(local).not.toHaveProperty("review")
    expect(local).not.toHaveProperty("url")
  })
})
