import { expect, test } from "@playwright/test"
import { eq, inArray, sql } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { producto, categoria } from "../lib/infraestructura/esquemas/producto"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { CATEGORIAS_INICIALES } from "../lib/modulos/productos/categorias"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { readFile } from "node:fs/promises"

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
const ids = Array.from({ length: 5 }, () => crypto.randomUUID())
const slug = (indice: number) => `publico-${ids[indice]}`
const nombres = ["Collar público real", "Collar relacionado", "Collar agotado", "Collar oculto", "Collar sin destacar"]

test.beforeAll(async () => {
  const conexion = con()
  try {
    await conexion.db.insert(categoria).values(CATEGORIAS_INICIALES.map((c) => ({ ...c }))).onConflictDoNothing()
    for (const [indice, id] of ids.entries()) {
      await conexion.db.insert(producto).values({ id, slug: slug(indice), nombre: nombres[indice], precio: "1250.50", categoriaCodigo: "collares", descripcion: "Descripción persistida del producto.", material: "Acero", cuidados: "Secar con paño suave.", publicado: indice !== 3, destacado: indice !== 4,
        imagenAssetId: "asset-privado-e2e", imagenPublicId: "public-id-privado-e2e", imagenVersionProveedor: "1", imagenUrlSegura: "https://example.test/publico.png", imagenAncho: 640, imagenAlto: 640, imagenFormato: "png" })
      await conexion.db.insert(inventario).values({ productoId: id, cantidad: indice === 2 ? 0 : 2 })
    }
  } finally { await conexion.pool.end() }
})
test.afterAll(async () => {
  const conexion = con()
  try {
    await conexion.db.delete(inventario).where(inArray(inventario.productoId, ids))
    await conexion.db.delete(producto).where(inArray(producto.id, ids))
  } finally { await conexion.pool.end() }
})

for (const [vista, width, height] of [["desktop", 1440, 1000], ["notebook", 1280, 800], ["mobile", 390, 844]] as const) {
  test(`catalogo/PDP reales en ${vista}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height })
    // Solo imagen visual del dataset aislado: sin red ni proveedor Cloudinary.
    await page.route("https://example.test/**", async (route) => route.fulfill({ contentType: "image/png", body: await readFile("public/images/products/angel-tears-rings.png") }))
    await page.goto("/catalogo")
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: nombres[2], exact: true })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: nombres[3], exact: true })).toHaveCount(0)
    await page.getByRole("button", { name: "Anillos", exact: true }).click()
    await expect(page.getByRole("status")).toContainText("No hay productos disponibles en esta categoría")
    await page.getByRole("button", { name: "Collares", exact: true }).click()
    await page.getByRole("heading", { name: nombres[0], exact: true }).click()
    await expect(page).toHaveURL(new RegExp(slug(0)))
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nombres[0])
    await expect(page.getByText("$1.250,50", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Descripción persistida del producto.")).toBeVisible()
    const relacionados = page.getByRole("region", { name: "También te puede interesar" })
    await expect(relacionados.getByRole("heading", { name: nombres[1], exact: true })).toBeVisible()
    await expect(relacionados.getByRole("heading", { name: nombres[0], exact: true })).toHaveCount(0)
    await expect(relacionados.getByRole("heading", { name: nombres[2], exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.screenshot({ path: info.outputPath(`pdp-${vista}.png`), fullPage: true })
    const respuesta = await page.goto(`/catalogo/${slug(2)}`)
    expect(respuesta?.status()).toBe(200)
    await expect(page.getByText("Sin stock", { exact: true })).toBeVisible()
    expect((await page.goto(`/catalogo/${slug(3)}`))?.status()).toBe(404)
    expect((await page.goto("/catalogo/no-existe-este-producto"))?.status()).toBe(404)
  })
}

test("HTML util sin JS ni identificadores privados de imagen", async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await contexto.newPage()
    await page.route("https://example.test/**", (route) => route.abort())
    const respuesta = await page.goto(`/catalogo/${slug(0)}`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nombres[0])
    await expect(page.getByText("Descripción persistida del producto.")).toBeVisible()
    const html = await respuesta!.text()
    expect(html).not.toContain("asset-privado-e2e")
    expect(html).not.toContain("public-id-privado-e2e")
  } finally { await contexto.close() }
})

test("Home destacados reales y contenido confirmado conservado", async ({ page }) => {
  await page.route("https://example.test/**", (route) => route.abort())
  await page.goto("/")
  const seleccion = page.getByRole("region", { name: "Accesorios para todos los días" })
  await expect(seleccion.getByRole("heading", { name: nombres[0], exact: true })).toBeVisible()
  for (const indice of [2, 3, 4]) await expect(seleccion.getByRole("heading", { name: nombres[indice], exact: true })).toHaveCount(0)
  await expect(page.getByText(/Entre Ríos 924/).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "WhatsApp de Angel Tears (abre otra pestaña)" })).toHaveAttribute("href", "https://wa.me/5493454266760")
})

test("metadata publica real comparte slug/contenido y evita canonical local", async ({ request }) => {
  const respuesta = await request.get(`/catalogo/${slug(0)}`)
  const html = await respuesta.text()
  expect(html).toContain(`${nombres[0]} | Angel Tears`)
  expect(html).toContain('property="og:image" content="https://example.test/publico.png"')
  expect(html).toContain('name="description" content="Descripción persistida del producto."')
  if (process.env.SITE_URL) {
    const canonical = `${new URL(process.env.SITE_URL).origin}/catalogo/${slug(0)}`
    expect(html).toContain(`rel="canonical" href="${canonical}"`)
    expect(html).toContain(`property="og:url" content="${canonical}"`)
  } else {
    expect(html).not.toContain('rel="canonical"')
    expect(html).toContain('name="robots" content="noindex, nofollow"')
  }
  expect(html).not.toMatch(/rel="canonical" href="https?:\/\/(localhost|127\.)/)
})

test("JSON-LD coincide con PDP, ARS, agotado y no ejecuta contenido persistido", async ({ page }) => {
  const conexion = con()
  const texto = '</script><script>window.atacado=true</script>'
  try {
    await conexion.db.update(producto).set({ descripcion: texto }).where(eq(producto.id, ids[0]))
    await page.route("https://example.test/**", (route) => route.abort())
    await page.goto(`/catalogo/${slug(0)}`)
    const datos = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "null")
    expect(datos).toMatchObject({ "@type": "Product", name: nombres[0], description: texto, offers: { price: "1250.50", priceCurrency: "ARS", availability: "https://schema.org/InStock" } })
    expect(await page.evaluate(() => "atacado" in window)).toBe(false)
    await page.goto(`/catalogo/${slug(2)}`)
    const agotado = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "null")
    expect(agotado.offers.availability).toBe("https://schema.org/OutOfStock")
    await expect(page.getByText("Sin stock", { exact: true })).toBeVisible()
    await page.goto("/")
    const local = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "null")
    expect(local).toMatchObject({ "@type": "LocalBusiness", name: "Angel Tears" })
    expect(local).not.toHaveProperty("openingHours")
  } finally {
    await conexion.db.update(producto).set({ descripcion: "Descripción persistida del producto." }).where(eq(producto.id, ids[0]))
    await conexion.pool.end()
  }
})

test("sitemap y robots siguen visibilidad real, incluido agotado y ocultacion posterior", async ({ request }) => {
  const robots = await request.get("/robots.txt")
  const sitemap = await request.get("/sitemap.xml")
  expect(robots.status()).toBe(200)
  expect(sitemap.status()).toBe(200)
  if (!process.env.SITE_URL) {
    expect(await robots.text()).toContain("Disallow: /")
    expect(await sitemap.text()).not.toContain("<loc>")
    return
  }
  const contenido = await sitemap.text()
  const origen = new URL(process.env.SITE_URL).origin
  expect(contenido).toContain(`<loc>${origen}/</loc>`)
  expect(contenido).toContain(`<loc>${origen}/catalogo</loc>`)
  expect(contenido).toContain(slug(0))
  expect(contenido).toContain(slug(2))
  expect(contenido).not.toContain(slug(3))
  expect(contenido).not.toMatch(/<loc>[^<]*\/(admin|api)/)
  expect(await robots.text()).toContain("Disallow: /admin")
  const conexion = con()
  try {
    await conexion.db.update(producto).set({ publicado: false }).where(eq(producto.id, ids[0]))
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(slug(0))
    const admin = await request.get("/admin/productos", { maxRedirects: 0 })
    expect([303, 307]).toContain(admin.status())
    expect(admin.headers().location).toContain("/admin/login")
  } finally {
    await conexion.db.update(producto).set({ publicado: true }).where(eq(producto.id, ids[0]))
    await conexion.pool.end()
  }
})

test("fallo PostgreSQL se muestra como error recuperable y no como vacio/404", async ({ page }) => {
  const conexion = con()
  try {
    await conexion.db.execute(sql`ALTER TABLE producto RENAME TO producto_e2e_no_disponible`)
    try {
      await page.goto("/catalogo")
      await expect(page.getByRole("heading", { name: "No pudimos cargar los productos" })).toBeVisible()
      await expect(page.getByRole("alert").filter({ hasText: "Ocurrió un problema" })).toBeVisible()
      await expect(page.getByText("No hay productos disponibles por el momento.")).toHaveCount(0)
    } finally { await conexion.db.execute(sql`ALTER TABLE producto_e2e_no_disponible RENAME TO producto`) }
    await page.getByRole("button", { name: "Reintentar" }).click()
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toBeVisible()
  } finally { await conexion.pool.end() }
})

test("publicar/ocultar/agotar/reponer refresca navegacion y solicitudes sin cache persistente", async ({ page }) => {
  const conexion = con()
  await page.route("https://example.test/**", (route) => route.abort())
  try {
    const respuesta = await page.goto("/catalogo")
    expect(respuesta?.headers()["cache-control"]).toContain("no-store")
    await page.getByRole("heading", { name: nombres[0], exact: true }).click()
    await conexion.db.update(producto).set({ publicado: false }).where(eq(producto.id, ids[0]))
    await page.getByRole("link", { name: "Volver al catálogo", exact: true }).first().click()
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toHaveCount(0)
    expect((await page.goto(`/catalogo/${slug(0)}`))?.status()).toBe(404)
    await page.goto("/")
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toHaveCount(0)
    await conexion.db.update(producto).set({ publicado: true }).where(eq(producto.id, ids[0]))
    await page.goto("/catalogo")
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toBeVisible()
    await conexion.db.update(inventario).set({ cantidad: 0 }).where(eq(inventario.productoId, ids[0]))
    await page.reload()
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toHaveCount(0)
    await page.goto("/")
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toHaveCount(0)
    expect((await page.goto(`/catalogo/${slug(0)}`))?.status()).toBe(200)
    await expect(page.getByText("Sin stock", { exact: true })).toBeVisible()
    await conexion.db.update(inventario).set({ cantidad: 2 }).where(eq(inventario.productoId, ids[0]))
    await page.goto("/catalogo")
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toBeVisible()
    await page.goto("/")
    await expect(page.getByRole("heading", { name: nombres[0], exact: true })).toBeVisible()
  } finally {
    await conexion.db.update(producto).set({ publicado: true }).where(eq(producto.id, ids[0]))
    await conexion.db.update(inventario).set({ cantidad: 2 }).where(eq(inventario.productoId, ids[0]))
    await conexion.pool.end()
  }
})
