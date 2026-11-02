import { expect, test, type Page } from "@playwright/test"
import { eq, inArray } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { producto, categoria } from "../lib/infraestructura/esquemas/producto"
import { productoMedia } from "../lib/infraestructura/esquemas/producto-media"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearImagenPrueba } from "../pruebas/imagenes-producto"
import { crearCuentaDePrueba, borrarCuentaDePrueba, reiniciarLimiteDeIntentos, vencerSesionesDePrueba, EMAIL_DE_PRUEBA, CONTRASENA_DE_PRUEBA } from "./apoyo/cuenta-de-prueba"
const ids = [crypto.randomUUID(), crypto.randomUUID()]
const nombres = ["Anillo dorado", "Collar nuevo"].map((n, i) => `${n} ${ids[i].slice(0, 8)}`)
const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
let categoriaCreada = false
async function entrar(page: Page) {
  await reiniciarLimiteDeIntentos(); await page.goto("/admin/login"); await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA); await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
  await page.getByRole("button", { name: "Ingresar", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/)
}
test.beforeAll(async () => {
  await crearCuentaDePrueba(); const c = con()
  try {
    categoriaCreada = !(await c.db.select().from(categoria).where(eq(categoria.codigo, "anillos"))).length
    await c.db.insert(categoria).values({ codigo: "anillos", nombre: "Anillos" }).onConflictDoNothing()
    await c.db.transaction(async tx => { for (let i = 0; i < ids.length; i++) {
      await tx.insert(producto).values({ id: ids[i], slug: `preview-${ids[i]}`, nombre: nombres[i], precio: "33000.50", categoriaCodigo: "anillos", descripcion: "Descripcion persistida de la pieza", material: "Acero", medida: "18 mm", color: "Dorado", cuidados: "Paño seco", ...(i === 0 ? { imagenAssetId: `A-${ids[i]}`, imagenPublicId: `pruebas/${ids[i]}/1`, imagenVersionProveedor: "1", imagenUrlSegura: `https://res.cloudinary.com/pruebas/image/upload/v1/${ids[i]}/1.png`, imagenAncho: 800, imagenAlto: 600, imagenFormato: "png" } : {}) })
      await tx.insert(inventario).values({ productoId: ids[i], cantidad: i === 0 ? 3 : 0 })
      if (i === 0) for (let n = 2; n <= 7; n++) await tx.insert(productoMedia).values({ productoId: ids[i], orden: n, assetId: `A-${ids[i]}-${n}`, publicId: `pruebas/${ids[i]}/${n}`, versionProveedor: "1", urlSegura: `https://res.cloudinary.com/pruebas/image/upload/v1/${ids[i]}/${n}.png`, ancho: 800, alto: 600, formato: "png" })
    } })
  } finally { await c.pool.end() }
})
test.afterAll(async () => { const c = con(); try { await c.db.delete(inventario).where(inArray(inventario.productoId, ids)); await c.db.delete(producto).where(inArray(producto.id, ids)); if (categoriaCreada) await c.db.delete(categoria).where(eq(categoria.codigo, "anillos")) } finally { await c.pool.end(); await borrarCuentaDePrueba() } })
test.beforeEach(async ({ context }) => { await context.route("https://res.cloudinary.com/pruebas/**", async r => r.fulfill({ contentType: "image/png", body: await crearImagenPrueba("png", 200, 150) })) })

test("oculto: preview privada de siete imagenes, publicar y Ver producto con PDP coincidente", async ({ page, context }, info) => {
  test.setTimeout(90000); await entrar(page); await page.goto("/admin/productos")
  await page.getByRole("button", { name: `Acciones de ${nombres[0]}`, exact: true }).click()
  await expect(page.getByRole("menuitem", { name: /Ver producto/ })).toHaveCount(0)
  await page.getByRole("menuitem", { name: "Vista previa", exact: true }).click()
  await expect(page).toHaveURL(/paso=vista-previa/)
  const detalle = page.getByRole("region", { name: "Detalle del producto", exact: true })
  await expect(detalle.getByRole("heading", { name: nombres[0], exact: true })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  expect((await page.request.get(`/catalogo/preview-${ids[0]}`)).status()).toBe(404)
  await expect(detalle.getByText("Acero", { exact: true })).toBeVisible(); await expect(detalle.getByText("Disponible", { exact: true })).toBeVisible()
  for (const width of [320, 390, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); await page.screenshot({ path: info.outputPath(`preview-${width}.png`), fullPage: true }) }
  const galeria = detalle.getByRole("region", { name: "Galería del producto" })
  await expect(galeria.getByRole("button", { name: /^Ver imagen / })).toHaveCount(7)
  await galeria.getByRole("button", { name: "Ver imagen 2", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(galeria.getByRole("button", { name: "Ver imagen 2", exact: true })).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Editar datos", exact: true }).click(); await expect(page.getByLabel("Nombre *")).toHaveValue(nombres[0])
  await page.getByRole("button", { name: "3. Vista previa", exact: true }).click(); await expect(detalle).toBeVisible()
  await page.getByRole("button", { name: "Gestionar imágenes", exact: true }).click(); await expect(page.getByRole("list", { name: "Imágenes guardadas" }).getByRole("listitem")).toHaveCount(7)
  await page.getByRole("button", { name: "Continuar a vista previa", exact: true }).click(); await expect(detalle).toBeVisible()
  await page.getByRole("button", { name: "Publicar producto", exact: true }).click(); await expect(page.getByText("Producto publicado.", { exact: true })).toBeVisible()
  const enlace = page.getByRole("link", { name: "Ver producto (abre otra pestaña)", exact: true })
  await expect(enlace).toHaveAttribute("href", `/catalogo/preview-${ids[0]}`); await expect(enlace).toHaveAttribute("target", "_blank")
  const nueva = context.waitForEvent("page"); await enlace.click(); const publico = await nueva; await publico.waitForLoadState("networkidle")
  await expect(publico.getByRole("heading", { level: 1, name: nombres[0], exact: true })).toBeVisible()
  const publicoDetalle = publico.getByRole("region", { name: "Detalle del producto", exact: true })
  expect(await publicoDetalle.innerText()).toBe(await detalle.innerText())
  await publico.screenshot({ path: info.outputPath("pdp-publicado.png"), fullPage: true }); await publico.close()
  const c = con(); try { expect((await c.db.select().from(producto).where(eq(producto.id, ids[0])))[0]).toMatchObject({ publicado: true, version: 2 }) } finally { await c.pool.end() }
})
test("seleccion inicia sola, pending bloquea preview y error permite retry/quitar sin perder archivo", async ({ page }, info) => {
  test.setTimeout(60000); await entrar(page); await page.goto(`/admin/productos/${ids[1]}/editar?paso=imagen`)
  const panel = page.getByRole("region", { name: `Imagen de ${nombres[1]}` })
  let liberar!: () => void; const espera = new Promise<void>(r => { liberar = r }); let procesando = false, envios = 0
  await page.route(`**/api/admin/productos/${ids[1]}/medios`, async r => { if (r.request().method() === "POST") { envios++; const respuesta = await r.fetch(); procesando = true; await espera; await r.fulfill({ response: respuesta }) } else await r.continue() })
  try {
    const png = await crearImagenPrueba(); await panel.locator('input[multiple]').setInputFiles(["A.png", "B.png"].map(name => ({ name, mimeType: "image/png", buffer: png })))
    await expect.poll(() => procesando).toBe(true)
    await expect(panel.getByRole("button", { name: "Subir archivos", exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Continuar a vista previa", exact: true })).toBeDisabled(); await expect(page.getByRole("button", { name: "3. Vista previa", exact: true })).toBeDisabled()
    await expect(panel.getByRole("progressbar")).not.toHaveAttribute("value")
    await expect(page.getByText("Guardando 2 imágenes…", { exact: true })).toBeVisible()
    await page.screenshot({ path: info.outputPath("auto-processing.png"), fullPage: true })
    liberar(); await expect(panel.getByRole("button", { name: "Reintentar", exact: true })).toHaveCount(2); expect(envios).toBe(2)
    await page.unrouteAll({ behavior: "wait" })
    const cola = panel.getByRole("list", { name: "Archivos seleccionados" })
    await cola.getByRole("listitem").first().getByRole("button", { name: "Reintentar", exact: true }).click(); await expect(cola.getByRole("button", { name: "Reintentar", exact: true })).toHaveCount(2)
    await expect(cola.getByText("A.png", { exact: true })).toBeVisible(); await expect(cola.getByText("B.png", { exact: true })).toBeVisible()
    await cola.getByRole("button", { name: "Quitar archivo", exact: true }).first().click(); await cola.getByRole("button", { name: "Quitar archivo", exact: true }).first().click()
    await expect(page.getByRole("button", { name: "Continuar a vista previa", exact: true })).toBeEnabled(); await page.getByRole("button", { name: "Continuar a vista previa", exact: true }).click()
    await expect(page.getByRole("region", { name: "Detalle del producto", exact: true }).getByText("Sin stock", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Publicar producto", exact: true })).toBeDisabled()
  } finally { liberar(); await page.unrouteAll({ behavior: "ignoreErrors" }) }
})
test("preview vuelve a exigir sesion al leer aunque el editor ya estuviera abierto", async ({ page }) => {
  await entrar(page); await page.goto(`/admin/productos/${ids[1]}/editar`); await expect(page.getByLabel("Nombre *")).toBeVisible()
  await vencerSesionesDePrueba(); await page.getByRole("button", { name: "3. Vista previa", exact: true }).click()
  await expect(page.getByRole("region", { name: "Vista previa del producto", exact: true }).getByRole("alert")).toHaveText("Tu sesión venció. Volvé a iniciar sesión.")
  await expect(page.getByRole("region", { name: "Detalle del producto", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Publicar producto", exact: true })).toBeDisabled()
})
