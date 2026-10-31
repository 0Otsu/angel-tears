import { expect, test } from "@playwright/test"
import { inArray, sql } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { producto, categoria } from "../lib/infraestructura/esquemas/producto"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { CATEGORIAS_INICIALES } from "../lib/modulos/productos/categorias"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { readFile } from "node:fs/promises"

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
const slug = (indice: number) => `publico-${ids[indice]}`
const nombres = ["Collar público real", "Collar relacionado", "Collar agotado", "Collar oculto"]

test.beforeAll(async () => {
  const conexion = con()
  try {
    await conexion.db.insert(categoria).values(CATEGORIAS_INICIALES.map((c) => ({ ...c }))).onConflictDoNothing()
    for (const [indice, id] of ids.entries()) {
      await conexion.db.insert(producto).values({ id, slug: slug(indice), nombre: nombres[indice], precio: "1250.50", categoriaCodigo: "collares", descripcion: "Descripción persistida del producto.", material: "Acero", cuidados: "Secar con paño suave.", publicado: indice !== 3, destacado: true,
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
