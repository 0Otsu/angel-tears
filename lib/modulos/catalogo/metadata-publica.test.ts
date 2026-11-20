import { describe, expect, it } from "vitest"
import { leerOrigenIndexable, leerOrigenPublico } from "./origen-publico"
import { metadataProducto, metadataPublica } from "./metadata-publica"
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
  it.each(["http://localhost:3000", "https://localhost", "https://foo.localhost", "https://localhost.", "https://foo.localhost.", "https://127.0.0.1", "https://[::1]", "http://tienda.example", "https://tienda.example/ruta", "https://usuario:secreto@tienda.example", "https://tienda.example?x=1", "https://tienda.example:3000"])("rechaza origen no publico/ambiguo %s", (SITE_URL) => {
    expect(() => leerOrigenPublico({ SITE_URL })).toThrow("SITE_URL debe ser")
  })
  it("usa slug estable, descripcion e imagen real sin depender de disponibilidad", () => {
    const origen = leerOrigenPublico({ SITE_URL: "https://tienda.example/" })!
    const meta = metadataProducto(producto, origen)
    expect(meta.alternates).toEqual({ canonical: "https://tienda.example/catalogo/collar-estable" })
    expect(meta).toMatchObject({ title: "Collar", description: "Descripción real", openGraph: { url: "https://tienda.example/catalogo/collar-estable", images: [{ url: producto.imagen!.url, width: 600, height: 800 }] } })
  })

  it.each([
    { ANGEL_TEARS_PREVIEW: "1" },
    { VERCEL_ENV: "preview" },
    { VERCEL_PROJECT_PRODUCTION_URL: "angel-tears-demo.vercel.app" },
    { BETTER_AUTH_URL: "https://angel-tears-demo.vercel.app/" },
  ])("omite canonical en entornos no comerciales (%j) incluso con SITE_URL", (entorno) => {
    const SITE_URL = "https://tienda.example"
    expect(leerOrigenPublico({ SITE_URL })).toBe(SITE_URL)
    const meta = metadataPublica("Catálogo", "Descripción", "/catalogo", leerOrigenIndexable({ ...entorno, SITE_URL }))
    expect(meta.robots).toMatchObject({ index: false })
    expect(meta.alternates).toBeUndefined()
  })

  it.each(["https://angel-tears-demo.vercel.app", "https://angel-tears.up.railway.app"])(
    "omite el origen indexable para el subdominio de hosting %s", SITE_URL => {
      expect(leerOrigenIndexable({ SITE_URL })).toBeNull()
    },
  )

  it("usa el ícono existente como imagen absoluta para compartir inicio y catálogo", () => {
    const origen = leerOrigenIndexable({ SITE_URL: "https://tienda.example" })
    expect(metadataPublica("Inicio", "Descripción", "/", origen)).toMatchObject({
      openGraph: { url: "https://tienda.example/", images: [{ url: "https://tienda.example/icon.png" }] },
      twitter: { card: "summary", images: [{ url: "https://tienda.example/icon.png" }] },
    })
  })
})
