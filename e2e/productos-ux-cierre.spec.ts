import { expect, test, type Page } from "@playwright/test"
import { eq, inArray } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { categoria, producto } from "../lib/infraestructura/esquemas/producto"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearImagenPrueba } from "../pruebas/imagenes-producto"
import { crearCuentaDePrueba, borrarCuentaDePrueba, reiniciarLimiteDeIntentos, EMAIL_DE_PRUEBA, CONTRASENA_DE_PRUEBA } from "./apoyo/cuenta-de-prueba"

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
const nombres = ["Anillo UX", "Pulsera UX", "Collar UX"].map((n, i) => `${n} ${ids[i].slice(0, 8)}`)
let sembrados = false, categoriaCreada = false
async function prepararProductos() {
  if (sembrados) return
  const c = con()
  try { await c.db.transaction(async tx => {
    for (let i = 0; i < ids.length; i++) {
      await tx.insert(producto).values({ id: ids[i], nombre: nombres[i], slug: `ux-${ids[i]}`, precio: i === 0 ? "33000.50" : "33000.00", categoriaCodigo: "collares", publicado: i === 1, destacado: i === 1,
        ...(i < 2 ? { imagenAssetId: `ux-${ids[i]}`, imagenPublicId: `pruebas/${ids[i]}`, imagenVersionProveedor: "1", imagenUrlSegura: `https://res.cloudinary.com/pruebas/image/upload/v1/${ids[i]}.png`, imagenAncho: 800, imagenAlto: 600, imagenFormato: "png" } : {}) })
      await tx.insert(inventario).values({ productoId: ids[i], cantidad: 0 })
    }
  }); sembrados = true } finally { await c.pool.end() }
}
async function entrar(page: Page) {
  await reiniciarLimiteDeIntentos(); await page.goto("/admin/login")
  await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA); await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
  await page.getByRole("button", { name: "Ingresar", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/)
}
test.beforeAll(async () => {
  await crearCuentaDePrueba(); const c = con()
  try { categoriaCreada = !(await c.db.select().from(categoria).where(eq(categoria.codigo, "collares"))).length; await c.db.insert(categoria).values({ codigo: "collares", nombre: "Collares" }).onConflictDoNothing() } finally { await c.pool.end() }
})
test.afterAll(async () => {
  const c = con()
  try { await c.db.delete(inventario).where(inArray(inventario.productoId, ids)); await c.db.delete(producto).where(inArray(producto.id, ids)); if (categoriaCreada) await c.db.delete(categoria).where(eq(categoria.codigo, "collares")) } finally { await c.pool.end(); await borrarCuentaDePrueba() }
})
test.beforeEach(async ({ page }) => { await page.route("https://res.cloudinary.com/pruebas/**", async r => r.fulfill({ contentType: "image/png", body: await crearImagenPrueba("png", 200, 150) })) })

test("vacio real prioriza crear y Cancelar sin cambios sale sin confirmacion", async ({ page }, info) => {
  await entrar(page); await page.goto("/admin/productos")
  await expect(page.getByRole("heading", { name: "Todavía no hay productos", exact: true })).toBeVisible()
  for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: info.outputPath(`vacio-${width}.png`), fullPage: true }) }
  await page.getByRole("button", { name: "Crear primer producto", exact: true }).click()
  await expect(page.getByLabel("Nombre *")).toBeVisible(); await expect(page.getByRole("button", { name: "2. Imágenes", exact: true })).toBeDisabled()
  await page.getByRole("button", { name: "Cancelar", exact: true }).click(); await expect(page).toHaveURL(/\/admin\/productos$/)
  await expect(page.getByRole("dialog")).toHaveCount(0)
})
test("gestion: cinco anchos, menu accesible, comando termina antes del refresh y conflicto real", async ({ page }, info) => {
  test.setTimeout(90000); await prepararProductos(); await entrar(page); await page.goto("/admin/productos")
  const c = con(); let liberar = () => {}
  try {
    for (const width of [320, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
      await expect(page.getByRole("search", { name: "Filtrar productos" })).toBeVisible()
      const nuevo = page.getByRole("button", { name: "Nuevo producto", exact: true }); expect((await nuevo.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await page.screenshot({ path: info.outputPath(`listado-${width}.png`), fullPage: true })
    }
    const fila = page.getByRole("list", { name: "Productos registrados" }).getByRole("listitem").filter({ has: page.getByRole("heading", { name: nombres[0], exact: true }) })
    const menu = fila.getByRole("button", { name: `Acciones de ${nombres[0]}`, exact: true })
    await menu.focus(); await page.keyboard.press("Enter"); await expect(page.getByRole("menuitem", { name: "Publicar", exact: true })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Gestionar imágenes", exact: true })).toBeVisible()
    await page.keyboard.press("Escape"); await expect(menu).toBeFocused()
    let refrescando = false
    const espera = new Promise<void>(r => { liberar = r })
    await page.route("**/admin/productos*", async r => {
      if (r.request().method() === "GET" && r.request().headers()["rsc"] === "1") { const respuesta = await r.fetch(); refrescando = true; await espera; await r.fulfill({ response: respuesta }) }
      else await r.continue()
    })
    await menu.click(); await page.getByRole("menuitem", { name: "Publicar", exact: true }).click()
    await expect.poll(() => refrescando).toBe(true)
    expect((await c.db.select().from(producto).where(eq(producto.id, ids[0])))[0].publicado).toBe(true)
    await expect(menu).toBeEnabled(); await expect(menu).toHaveAttribute("aria-busy", "false")
    await expect(fila.getByText("Publicado", { exact: true })).toBeVisible(); await expect(page.getByText("Producto publicado.", { exact: true })).toBeVisible()
    await expect(page.getByText("Publicando…", { exact: true })).toHaveCount(0)
    await page.screenshot({ path: info.outputPath("mutacion-confirmada-refresh-pendiente.png"), fullPage: true })
    liberar(); await page.unrouteAll({ behavior: "wait" }); await page.waitForLoadState("networkidle")
    await menu.click(); await expect(page.getByRole("menuitem", { name: "Ocultar", exact: true })).toBeVisible(); await page.keyboard.press("Escape")
    await c.pool.query('update producto set version=version+1 where id=$1', [ids[0]])
    await menu.click(); await page.getByRole("menuitem", { name: "Ocultar", exact: true }).click()
    await expect(fila.getByRole("alert")).toHaveText("El producto cambió desde que lo abriste.")
    await expect(fila.getByRole("button", { name: "Recargar datos", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: `Acciones de ${nombres[1]}`, exact: true })).toBeEnabled()
    await page.screenshot({ path: info.outputPath("conflicto.png"), fullPage: true })
  } finally { liberar(); await c.pool.end() }
})
test("wizard: borrador conservado, error por archivo sin otra dropzone, retry y finalizar", async ({ page }, info) => {
  test.setTimeout(90000); await prepararProductos(); await entrar(page); await page.goto(`/admin/productos/${ids[2]}/editar`)
  await page.getByLabel("Material", { exact: true }).fill("Acero")
  await page.getByRole("button", { name: "3. Vista previa", exact: true }).click()
  await expect(page.getByText("Tenés cambios sin guardar.", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Guardar como oculto", exact: true })).toBeDisabled()
  await page.getByRole("button", { name: "Volver a Datos", exact: true }).click(); await expect(page.getByLabel("Material", { exact: true })).toHaveValue("Acero")
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click(); await expect(page.getByText("Cambios guardados.", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "2. Imágenes", exact: true }).click()
  const panel = page.getByRole("region", { name: `Imagen de ${nombres[2]}` })
  await panel.locator('input[multiple]').setInputFiles({ name: "invalido.txt", mimeType: "text/plain", buffer: Buffer.from("invalido") })
  await expect(panel.getByRole("alert")).toBeVisible(); await expect(panel.getByText("invalido.txt", { exact: true })).toBeVisible()
  await expect(panel.getByRole("button", { name: "Seleccionar archivo para cargar", exact: true })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "Agregar archivos", exact: true })).toHaveCount(1)
  await expect(panel.getByRole("button", { name: "Quitar archivo", exact: true })).toHaveCount(1)
  await page.screenshot({ path: info.outputPath("validacion-archivo.png"), fullPage: true })
  await panel.getByRole("button", { name: "Quitar archivo", exact: true }).click()
  let uploads = 0; page.on("request", r => { if (r.method() === "POST" && r.url().includes(`/productos/${ids[2]}/medios`)) uploads++ })
  await panel.locator('input[multiple]').setInputFiles({ name: "anillo.png", mimeType: "image/png", buffer: await crearImagenPrueba() })
  await expect(panel.getByRole("button", { name: "Subir archivos", exact: true })).toHaveCount(0)
  await expect(panel.getByRole("alert")).toContainText("La carga de imágenes no está disponible")
  await expect(panel.getByAltText("Vista previa local seleccionada")).toBeVisible()
  await panel.getByRole("button", { name: "Reintentar", exact: true }).click(); await expect.poll(() => uploads).toBe(2)
  await expect(panel.getByRole("alert")).toContainText("La carga de imágenes no está disponible")
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: info.outputPath("retry-mobile.png"), fullPage: true })
  await panel.getByRole("button", { name: "Quitar archivo", exact: true }).click()
  await page.getByRole("button", { name: "Continuar a vista previa", exact: true }).click()
  await expect(page.getByText("$33.000", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Recargar datos", exact: true })).toHaveCount(0)
  for (const width of [320, 390, 768, 1280, 1440]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); await page.screenshot({ path: info.outputPath(`finalizar-${width}.png`), fullPage: true }) }
  await page.getByRole("button", { name: "Guardar como oculto", exact: true }).click(); await expect(page).toHaveURL(/\/admin\/productos(?:\?cancelado=.*)?$/)
  await expect(page.getByText("El producto quedó guardado como oculto.", { exact: true })).toBeVisible()
})
