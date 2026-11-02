import { expect, test } from "@playwright/test"
import { eq } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { producto, categoria } from "../lib/infraestructura/esquemas/producto"
import { productoMedia } from "../lib/infraestructura/esquemas/producto-media"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearImagenPrueba } from "../pruebas/imagenes-producto"
import { crearCuentaDePrueba, borrarCuentaDePrueba, EMAIL_DE_PRUEBA, CONTRASENA_DE_PRUEBA, reiniciarLimiteDeIntentos } from "./apoyo/cuenta-de-prueba"

test.beforeAll(async () => { await crearCuentaDePrueba() })
test.afterAll(async () => { await borrarCuentaDePrueba() })
for (const [vista, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]] as const) {
  test(`galeria, seleccion multiple, retry aislado y principal en ${vista}`, async ({ page }, info) => {
    const con = crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
    const id = crypto.randomUUID(), nombre = `Galeria E2E ${vista}`, png = await crearImagenPrueba()
    const urlA = `https://images.example.test/${id}/A.png`, urlB = `https://images.example.test/${id}/B.png`
    const categorias = await con.db.select().from(categoria).where(eq(categoria.codigo, "collares"))
    try {
      if (!categorias.length) await con.db.insert(categoria).values({ codigo: "collares", nombre: "Collares" })
      await con.db.transaction(async tx => {
        await tx.insert(producto).values({ id, nombre, slug: `galeria-${id}`, precio: "222.50", categoriaCodigo: "collares", publicado: true, imagenAssetId: `a-${id}`, imagenPublicId: `prueba/${id}/A`, imagenVersionProveedor: "1", imagenUrlSegura: urlA, imagenAncho: 12, imagenAlto: 8, imagenFormato: "png" })
        await tx.insert(inventario).values({ productoId: id, cantidad: 3 })
        await tx.insert(productoMedia).values({ productoId: id, orden: 2, assetId: `b-${id}`, publicId: `prueba/${id}/B`, versionProveedor: "1", urlSegura: urlB, ancho: 12, alto: 8, formato: "png" })
      })
      await page.route("https://images.example.test/**", r => r.fulfill({ status: 200, contentType: "image/png", body: png }))
      await page.setViewportSize({ width, height }); await reiniciarLimiteDeIntentos()
      await page.goto("/admin/login"); await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA); await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
      await page.getByRole("button", { name: "Ingresar", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/)
      await page.goto(`/admin/productos/${id}/editar?paso=imagen`)
      const panel = page.getByRole("region", { name: `Imagen de ${nombre}` }), input = panel.locator('input[multiple]')
      await expect(panel.getByText("✓ Imagen principal")).toBeVisible()
      const archivos = ["frente.png", "detalle.png"].map(name => ({ name, mimeType: "image/png", buffer: png }))
      await input.setInputFiles(Array.from({ length: 6 }, (_, i) => ({ ...archivos[0], name: `fuera-${i}.png` })))
      await expect(panel.getByRole("alert")).toContainText("máximo de 7")
      expect(await panel.getByRole("list", { name: "Archivos seleccionados" }).getByRole("listitem").count()).toBe(0)
      let intentos = 0
      page.on("request", r => { if (r.method() === "POST" && r.url().endsWith(`/api/admin/productos/${id}/medios`)) intentos++ })
      await input.setInputFiles(archivos)
      await expect(panel.getByRole("button", { name: "Subir archivos" })).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Continuar a vista previa", exact: true })).toBeDisabled()
      await panel.screenshot({ path: info.outputPath(`galeria-carga-${vista}.png`) })
      await expect(panel.getByRole("button", { name: "Reintentar", exact: true })).toHaveCount(2)
      expect(intentos).toBe(2)
      const cola = panel.getByRole("list", { name: "Archivos seleccionados" })
      await cola.getByRole("listitem").first().getByRole("button", { name: "Reintentar", exact: true }).click()
      await expect(cola.getByRole("button", { name: "Reintentar", exact: true })).toHaveCount(2)
      expect(intentos).toBe(3)
      await panel.screenshot({ path: info.outputPath(`galeria-error-${vista}.png`) })
      await cola.getByRole("button", { name: "Quitar archivo" }).first().click()
      await cola.getByRole("button", { name: "Quitar archivo" }).first().click()
      const guardadas = panel.getByRole("list", { name: "Imágenes guardadas" })
      await guardadas.getByRole("button", { name: "Hacer principal" }).click()
      await expect.poll(async () => (await con.db.select().from(producto).where(eq(producto.id, id)))[0].imagenUrlSegura).toBe(urlB)
      await panel.screenshot({ path: info.outputPath(`galeria-principal-${vista}.png`) })
      await page.goto(`/catalogo/galeria-${id}`)
      const galeria = page.getByRole("region", { name: "Galería del producto" })
      await expect(galeria.locator('img').first()).toHaveAttribute("src", urlB)
      const selector = galeria.getByRole("button", { name: "Ver imagen 2" }); await selector.focus(); await page.keyboard.press("Enter")
      await expect(galeria.locator('img').first()).toHaveAttribute("src", urlA)
      expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toBe(urlB)
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
      await page.screenshot({ path: info.outputPath(`galeria-pdp-${vista}.png`), fullPage: true })
      await page.goto(`/admin/productos/${id}/editar?paso=imagen`)
      await expect(panel.getByRole("list", { name: "Imágenes guardadas" }).getByRole("listitem")).toHaveCount(2)
      await panel.getByRole("list", { name: "Imágenes guardadas" }).getByRole("listitem").first().getByRole("button", { name: "Quitar imagen" }).click()
      await expect(panel.getByRole("note")).toContainText("limpiar")
      await expect(panel.getByRole("list", { name: "Imágenes guardadas" }).getByRole("listitem")).toHaveCount(1)
      await panel.getByRole("button", { name: "Quitar imagen" }).click()
      await expect(panel.getByRole("alert")).toContainText("última imagen")
      expect((await con.db.select().from(producto).where(eq(producto.id, id)))[0]).toMatchObject({ publicado: true, imagenUrlSegura: urlB })
    } finally {
      await con.db.delete(inventario).where(eq(inventario.productoId, id)); await con.db.delete(producto).where(eq(producto.id, id))
      if (!categorias.length) await con.db.delete(categoria).where(eq(categoria.codigo, "collares"))
      await con.pool.end()
    }
  })
}
test("galeria privada no devuelve referencias sin sesion", async ({ request }) => {
  expect((await request.get(`/api/admin/productos/${crypto.randomUUID()}/medios`)).status()).toBe(401)
})
