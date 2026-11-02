import { expect, test } from "@playwright/test"
import { eq } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { producto, categoria } from "../lib/infraestructura/esquemas/producto"
import { productoMedia } from "../lib/infraestructura/esquemas/producto-media"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearImagenPrueba } from "../pruebas/imagenes-producto"
import { crearCuentaDePrueba, borrarCuentaDePrueba, EMAIL_DE_PRUEBA, CONTRASENA_DE_PRUEBA, reiniciarLimiteDeIntentos } from "./apoyo/cuenta-de-prueba"

const id = crypto.randomUUID(), nombre = "Producto para revision responsive", slug = `responsive-${id}`
const url = (n: number) => `https://res.cloudinary.com/pruebas/image/upload/v1/angel-tears/desarrollo/productos/${id}/${n}.png`
const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
let categoriaCreada = false
test.beforeAll(async () => {
  await crearCuentaDePrueba()
  const c = con()
  try {
    categoriaCreada = !(await c.db.select().from(categoria).where(eq(categoria.codigo, "collares"))).length
    await c.db.insert(categoria).values({ codigo: "collares", nombre: "Collares" }).onConflictDoNothing()
    await c.db.transaction(async tx => {
      await tx.insert(producto).values({ id, nombre, slug, precio: "1250.50", categoriaCodigo: "collares", publicado: true, destacado: true, imagenAssetId: `asset-${id}`, imagenPublicId: `pruebas/${id}/1`, imagenVersionProveedor: "1", imagenUrlSegura: url(1), imagenAncho: 1200, imagenAlto: 896, imagenFormato: "png" })
      await tx.insert(inventario).values({ productoId: id, cantidad: 3 })
      for (let n = 2; n <= 7; n++) await tx.insert(productoMedia).values({ productoId: id, orden: n, assetId: `asset-${id}-${n}`, publicId: `pruebas/${id}/${n}`, versionProveedor: "1", urlSegura: url(n), ancho: 1200, alto: 896, formato: "png" })
    })
  } finally { await c.pool.end() }
})
test.afterAll(async () => {
  const c = con()
  try { await c.db.delete(inventario).where(eq(inventario.productoId, id)); await c.db.delete(producto).where(eq(producto.id, id)); if (categoriaCreada) await c.db.delete(categoria).where(eq(categoria.codigo, "collares")) }
  finally { await c.pool.end(); await borrarCuentaDePrueba() }
})
test.beforeEach(async ({ page }) => {
  await page.route("https://res.cloudinary.com/pruebas/**", async r => {
    const ancho = Math.min(Number(r.request().url().match(/w_(\d+)/)?.[1] ?? 1200), 1200)
    await r.fulfill({ contentType: "image/webp", body: await crearImagenPrueba("webp", ancho, Math.max(1, Math.round(ancho * 896 / 1200))) })
  })
})
const anchos = [320, 390, 768, 1280, 1440]
test("publico/galeria: cinco anchos, delivery responsive, teclado y movimiento reducido", async ({ page }, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: "reduce" })
  for (const width of anchos) {
    await page.setViewportSize({ width, height: 900 })
    for (const ruta of ["/", "/catalogo", `/catalogo/${slug}`]) {
      await page.goto(ruta); await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
      expect(await page.locator("img:not([alt])").count()).toBe(0)
      if (width < 1024) {
        const menu = page.locator('button[aria-controls="menu-publico-movil"]')
        expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(44)
        await menu.focus(); await page.keyboard.press("Enter"); await expect(menu).toHaveAttribute("aria-expanded", "true")
        await page.keyboard.press("Escape"); await expect(menu).toBeFocused(); await expect(menu).toHaveAttribute("aria-expanded", "false")
      }
      if (ruta.includes(`/catalogo/${slug}`)) {
        const galeria = page.getByRole("region", { name: "Galería del producto" })
        await expect(galeria.locator("img").first()).toHaveAttribute("srcset", /c_limit,w_/)
        await expect(galeria.locator('img[sizes="64px"]')).toHaveCount(7)
        expect(await galeria.locator('img[sizes="64px"][loading="lazy"]').count()).toBe(7)
        const thumb = galeria.getByRole("button", { name: "Ver imagen 2", exact: true })
        await thumb.focus(); await page.keyboard.press("Enter"); await expect(thumb).toHaveAttribute("aria-pressed", "true")
        await expect(galeria.locator("img").first()).toHaveAttribute("src", /\/2\.png$/)
        expect(await page.locator('link[rel="preload"][as="image"]').count()).toBeLessThanOrEqual(1)
        await page.screenshot({ path: info.outputPath(`pdp-${width}.png`), fullPage: true })
      }
    }
  }
})
test("admin galeria: cinco anchos, siete thumbnails acotados y foco", async ({ page }, info) => {
  test.setTimeout(60000)
  const imagenAcceso: string[] = []
  page.on("request", r => { if (r.url().includes("casa-login")) imagenAcceso.push(r.url()) })
  await page.setViewportSize({ width: 390, height: 844 })
  await reiniciarLimiteDeIntentos(); await page.goto("/admin/login", { waitUntil: "networkidle" })
  expect(imagenAcceso).toHaveLength(0)
  await page.setViewportSize({ width: 1366, height: 900 })
  await expect.poll(() => imagenAcceso.length).toBeGreaterThan(0)
  await page.locator("aside img").evaluate(i => (i as HTMLImageElement).decode())
  await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA); await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
  await page.getByRole("button", { name: "Ingresar", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/)
  for (const width of anchos) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(`/admin/productos/${id}/editar?paso=imagen`)
    const lista = page.getByRole("list", { name: "Imágenes guardadas" })
    await expect(lista.getByRole("listitem")).toHaveCount(7)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await expect(lista.locator("img").first()).toHaveAttribute("srcset", /w_256/)
    const boton = lista.getByRole("button", { name: "Reemplazar", exact: true }).first(); await boton.focus(); await expect(boton).toBeFocused()
    await page.screenshot({ path: info.outputPath(`admin-galeria-${width}.png`), fullPage: true })
  }
})
test("fallo remoto conserva la caja y el optimizador Next no acepta origen remoto arbitrario", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`/catalogo/${slug}`)
  const caja = page.getByRole("region", { name: "Galería del producto" }).locator("div").first()
  const antes = await caja.boundingBox()
  await page.unroute("https://res.cloudinary.com/pruebas/**"); await page.route("https://res.cloudinary.com/pruebas/**", r => r.abort())
  await page.reload(); await expect(page.getByRole("img", { name: /Imagen no disponible/ }).first()).toBeVisible()
  const despues = await caja.boundingBox(); expect(despues!.width).toBe(antes!.width); expect(despues!.height).toBe(antes!.height)
  const respuesta = await request.get('/_next/image?url=https%3A%2F%2Fexample.test%2Ffoto.png&w=640&q=75')
  expect(respuesta.status()).toBe(400)
})
