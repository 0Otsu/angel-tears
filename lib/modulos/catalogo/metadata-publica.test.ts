import { describe, expect, it } from "vitest"
import { leerOrigenPublico } from "./origen-publico"
import { metadataProducto } from "./metadata-publica"
import type { ProductoPublico } from "./contrato"

const producto: ProductoPublico = { id: "id", slug: "collar-estable", nombre: "Collar", precio: "12.50", moneda: "ARS", categoriaCodigo: "collares", categoriaNombre: "Collares", descripcion: "Descripción real", material: null, medida: null, color: null, cuidados: null, destacado: false, disponible: false, imagen: { url: "https://example.test/real.jpg", ancho: 600, alto: 800, alt: "Collar" } }
describe("metadata con origen explicito", () => {
  it("sin dominio no inventa canonical/OG url ni hereda localhost", () => {
    expect(leerOrigenPublico({})).toBeNull()
    const meta = metadataProducto(producto, null)
    expect(meta.alternates).toBeUndefined()
    expect(meta.openGraph).not.toHaveProperty("url")
    expect(meta.robots).toEqual({ index: false, follow: false })
  })
  it.each(["http://localhost:3000", "https://localhost", "https://foo.localhost", "https://127.0.0.1", "https://[::1]", "http://tienda.example", "https://tienda.example/ruta", "https://usuario:secreto@tienda.example", "https://tienda.example?x=1", "https://tienda.example:3000"])("rechaza origen no publico/ambiguo %s", (SITE_URL) => {
    expect(() => leerOrigenPublico({ SITE_URL })).toThrow("SITE_URL debe ser")
  })
  it("usa slug estable, descripcion e imagen real sin depender de disponibilidad", () => {
    const origen = leerOrigenPublico({ SITE_URL: "https://tienda.example/" })!
    const meta = metadataProducto(producto, origen)
    expect(meta.alternates).toEqual({ canonical: "https://tienda.example/catalogo/collar-estable" })
    expect(meta).toMatchObject({ title: "Collar", description: "Descripción real", openGraph: { url: "https://tienda.example/catalogo/collar-estable", images: [{ url: producto.imagen!.url, width: 600, height: 800 }] } })
  })
})
