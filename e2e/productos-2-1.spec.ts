import { expect, test, type Page } from "@playwright/test"
import { eq, inArray } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { categoria, producto } from "../lib/infraestructura/esquemas/producto"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { CATEGORIAS_INICIALES, type CodigoCategoria } from "../lib/modulos/productos/categorias"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearImagenPrueba } from "../pruebas/imagenes-producto"
import { borrarCuentaDePrueba, CONTRASENA_DE_PRUEBA, crearCuentaDePrueba, EMAIL_DE_PRUEBA, reiniciarLimiteDeIntentos, vencerSesionesDePrueba } from "./apoyo/cuenta-de-prueba"

// Servidor Next real del arnes existente, exclusivamente sobre DATABASE_URL_TEST.
// Retiene una respuesta REAL solo en el navegador de prueba, sin tiempos ficticios en la app.
async function observarEspera(page: Page, patron: string, accion: () => Promise<unknown>, texto: string, captura: string) {
  let liberar!: () => void
  const espera = new Promise<void>(r => { liberar = r })
  let terminar!: () => void
  const finalizado = new Promise<void>(r => { terminar = r })
  await page.route(patron, async ruta => { try { const respuesta = await ruta.fetch(); await espera; await ruta.fulfill({ response: respuesta }) } finally { terminar() } })
  try {
    await accion()
    await expect(page.getByText(texto, { exact: true }).first()).toBeVisible()
    await page.screenshot({ path: captura, fullPage: true })
  } finally { liberar(); await finalizado; await page.unroute(patron) }
}
const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
const ids: string[] = []
let categoriasAgregadas: CodigoCategoria[] = []
test.beforeAll(async () => {
  await crearCuentaDePrueba()
  const conexion = con()
  try {
    const anteriores = await conexion.db.select().from(categoria)
    categoriasAgregadas = CATEGORIAS_INICIALES.map((c) => c.codigo).filter((codigo) => !anteriores.some((c) => c.codigo === codigo))
    await conexion.db.insert(categoria).values(CATEGORIAS_INICIALES.map((c) => ({ ...c }))).onConflictDoNothing()
  } finally { await conexion.pool.end() }
})
test.afterAll(async () => {
  const conexion = con()
  try {
    if (ids.length) {
      await conexion.db.delete(inventario).where(inArray(inventario.productoId, ids))
      await conexion.db.delete(producto).where(inArray(producto.id, ids))
    }
    if (categoriasAgregadas.length) await conexion.db.delete(categoria).where(inArray(categoria.codigo, categoriasAgregadas))
  } finally { await conexion.pool.end(); await borrarCuentaDePrueba() }
})

for (const [nombreVista, width, height] of [["desktop", 1440, 1000], ["notebook", 1280, 800], ["mobile", 390, 844]] as const) {
  test(`alta, consulta y edicion reales en ${nombreVista}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height })
    await reiniciarLimiteDeIntentos()
    await page.goto("/admin/productos")
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
    await observarEspera(page, "**/api/auth/sign-in/email", () => page.getByRole("button", { name: "Ingresar", exact: true }).click(), "Ingresando…", info.outputPath(`feedback-login-${nombreVista}.png`))
    await expect(page).toHaveURL(/\/admin$/)
    await page.goto("/admin/productos")
    await observarEspera(page, "**/admin/productos/nuevo*", () => page.getByRole("button", {name: "Nuevo producto", exact: true}).first().click(), "Cargando…", info.outputPath(`feedback-navegacion-${nombreVista}.png`))
    const formulario = page.getByRole("form")
    await expect(page.getByText("Datos de demostración · sin persistencia")).toHaveCount(0)
    await formulario.getByRole("button", { name: "Guardar y continuar" }).click()
    await expect(page.getByLabel("Nombre *")).toBeFocused()
    const nombre = `Producto E2E ${nombreVista}`
    await page.getByLabel("Nombre *").fill(nombre)
    await page.getByLabel("Precio de venta (ARS) *").fill("0")
    await page.getByLabel("Categoría *").selectOption("collares")
    await formulario.getByRole("button", { name: "Guardar y continuar" }).click()
    await expect(formulario.getByText("El precio debe ser mayor que cero.")).toBeVisible()
    await expect(page.getByLabel("Precio de venta (ARS) *")).toBeFocused()
    await page.getByLabel("Precio de venta (ARS) *").fill("1250.50")
    await page.getByLabel("Material", { exact: true }).fill("Acero")
    await observarEspera(page, "**/admin/productos/nuevo", () => formulario.getByRole("button", { name: "Guardar y continuar" }).click(), "Guardando…", info.outputPath(`feedback-guardar-${nombreVista}.png`))
    await expect(page).toHaveURL(/\/editar\?paso=imagen&alta=1$/)
    await expect(page.getByText(/Oculto/).first()).toBeVisible()
    const conexion = con()
    try {
      const [creado] = await conexion.db.select().from(producto).where(eq(producto.nombre, nombre))
      expect(creado).toBeDefined()
      ids.push(creado.id)
      expect(creado).toMatchObject({ precio: "1250.50", material: "Acero", publicado: false, destacado: false, imagenAssetId: null })
      const [saldo] = await conexion.db.select().from(inventario).where(eq(inventario.productoId, creado.id))
      expect(saldo).toMatchObject({ cantidad: 0, minimo: null })
      await page.getByRole("button",{name:"Continuar al resumen",exact:true}).click()
      await expect(page.getByRole("button",{name:"Publicar producto",exact:true})).toBeDisabled()
      await page.getByRole("button",{name:"Guardar como oculto",exact:true}).click()
      await page.getByRole("button",{name:`Acciones de ${nombre}`,exact:true}).click()
      await page.getByRole("menuitem",{name:"Editar",exact:true}).click()
      await page.getByLabel("Nombre *").fill(`${nombre} editado`)
      await page.getByLabel("Precio de venta (ARS) *").fill("90071992547409.93")
      await page.getByRole("button", { name: "Guardar cambios" }).click()
      await expect(formulario.getByRole("status")).toBeVisible()
      await expect(page.getByLabel("Precio de venta (ARS) *")).toHaveValue("90071992547409.93")
      await page.goto(`/admin/productos/${creado.id}/editar`)
      await expect(page.getByLabel("Precio de venta (ARS) *")).toHaveValue("90071992547409.93")
      const [editado] = await conexion.db.select().from(producto).where(eq(producto.id, creado.id))
      expect(editado).toMatchObject({ slug: creado.slug, version: 3, precio: "90071992547409.93", publicado: false })
      const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(desborde).toBe(false)
      await page.screenshot({ path: info.outputPath(`productos-${nombreVista}.png`), fullPage: true })
      await page.getByRole("button", {name: "2. Imagen",exact:true}).click()
      const imagen = page.getByRole("region", { name: `Imagen de ${nombre} editado` })
      if (nombreVista === "desktop") {
        const origenAjeno = await page.request.post(`/api/admin/productos/${creado.id}/imagen`, { headers: { origin: "https://ajeno.test" }, multipart: { version: "2", imagen: { name: "collar.png", mimeType: "image/png", buffer: await crearImagenPrueba() } } })
        expect(origenAjeno.status()).toBe(403)
      }
      await imagen.locator('input[multiple]').setInputFiles({ name: "collar.png", mimeType: "image/png", buffer: await crearImagenPrueba() })
      await expect(imagen.getByAltText(/Vista previa/)).toBeVisible()
      await imagen.getByRole("button", { name: "Subir imagen" }).click()
      await expect(imagen.getByRole("alert")).toContainText("La carga de imágenes no está disponible")
      await expect(imagen.getByAltText(/Vista previa/)).toBeVisible()
      await imagen.getByRole("button", { name: "Reintentar" }).click()
      await expect(imagen.getByRole("alert")).toContainText("La carga de imágenes no está disponible")
      expect((await conexion.db.select().from(producto).where(eq(producto.id, creado.id)))[0]).toMatchObject({ imagenAssetId: null, version: 3 })
      await imagen.screenshot({ path: info.outputPath(`primera-imagen-${nombreVista}.png`) })
      if (nombreVista === "desktop") {
        await page.goto("/admin/productos")
        const menu=page.getByRole("button",{name:`Acciones de ${nombre} editado`,exact:true})
        await menu.focus();await page.keyboard.press("Enter")
        await observarEspera(page, "**/admin/productos", () => page.getByRole("menuitem",{name:"Publicar",exact:true}).click(), "Publicando…", info.outputPath("feedback-publicar-desktop.png"))
        await expect(page.getByRole("alert")).toContainText("Agregá una imagen válida")
        await menu.click();await page.getByRole("menuitem",{name:"Destacar",exact:true}).click()
        await expect(page.getByText("Producto destacado.",{exact:true})).toBeVisible()
        await menu.click();await page.getByRole("menuitem",{name:"Quitar destacado",exact:true}).click()
        await expect(page.getByText("Se quitó de destacados.",{exact:true})).toBeVisible()
        await menu.click();await page.getByRole("menuitem",{name:"Editar",exact:true}).click()
        await page.getByLabel("Precio de venta (ARS) *").fill("3000.00")
        await vencerSesionesDePrueba()
        await page.getByRole("button", { name: "Guardar cambios" }).click()
        await expect(formulario.getByRole("alert")).toContainText("Tu sesión venció")
        await expect(page.getByLabel("Precio de venta (ARS) *")).toHaveValue("3000.00")
        expect((await conexion.db.select().from(producto).where(eq(producto.id, creado.id)))[0].precio).toBe("90071992547409.93")
      }
    } finally { await conexion.pool.end() }
  })
}

test("el Handler real de imagen rechaza una solicitud sin sesion", async ({ request }) => {
  const respuesta = await request.post(`/api/admin/productos/${crypto.randomUUID()}/imagen`, {
    headers: { origin: "http://localhost:3100" },
    multipart: { version: "1", imagen: { name: "falso.jpg", mimeType: "image/jpeg", buffer: Buffer.from("archivo falso") } },
  })
  expect(respuesta.status()).toBe(401)
  expect(await respuesta.json()).toMatchObject({ codigo: "sesion_requerida" })
})

for (const [vista, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]] as const) {
  test(`Cancelar conserva estado persistido y advierte borrador en ${vista}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height })
    await reiniciarLimiteDeIntentos()
    await page.goto("/admin/login")
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
    await page.getByRole("button", { name: "Ingresar", exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await page.goto("/admin/productos/nuevo")
    await expect(page.getByRole("link", { name: "Volver a Productos" })).toHaveCount(0)
    await page.getByLabel("Nombre *").fill(`Borrador ${vista}`)
    await page.getByRole("button", { name: "Cancelar", exact: true }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: "Seguir editando" }).click()
    await expect(page.getByLabel("Nombre *")).toHaveValue(`Borrador ${vista}`)
    await page.getByRole("button", { name: "Cancelar", exact: true }).click()
    await page.getByRole("button", { name: "Salir sin guardar" }).click()
    await expect(page).toHaveURL(/\/admin\/productos$/)
    const conexion = con()
    try {
      expect(await conexion.db.select().from(producto).where(eq(producto.nombre, `Borrador ${vista}`))).toHaveLength(0)
      await page.goto("/admin/productos/nuevo")
      const nombre = `Cancelar persistido ${vista}`
      await page.getByLabel("Nombre *").fill(nombre)
      await page.getByLabel("Precio de venta (ARS) *").fill("222")
      await page.getByLabel("Categoría *").selectOption("collares")
      await page.getByRole("button", { name: "Guardar y continuar" }).click()
      await expect(page).toHaveURL(/\/editar\?paso=imagen&alta=1$/)
      const [creado] = await conexion.db.select().from(producto).where(eq(producto.nombre, nombre))
      ids.push(creado.id)
      const imagen = page.getByRole("region", { name: `Imagen de ${nombre}` })
      await imagen.locator('input[multiple]').setInputFiles({ name: "sin-subir.png", mimeType: "image/png", buffer: await crearImagenPrueba() })
      await expect(imagen.getByAltText(/Vista previa/)).toBeVisible()
      await page.getByRole("button", { name: "Cancelar", exact: true }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
      await page.getByRole("button", { name: "Salir sin guardar" }).click()
      await expect(page.getByText("El producto quedó guardado como oculto.", { exact: true })).toBeVisible()
      expect((await conexion.db.select().from(producto).where(eq(producto.id, creado.id)))[0]).toEqual(creado)
      expect((await conexion.db.select().from(inventario).where(eq(inventario.productoId, creado.id)))[0].cantidad).toBe(0)
      await page.screenshot({ path: info.outputPath(`cancelar-${vista}.png`), fullPage: true })
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
      await expect(page).toHaveURL(/\/admin\/productos$/)
      await expect(page.getByText("El producto quedó guardado como oculto.", { exact: true })).toHaveCount(0, { timeout: 7000 })
      await page.reload()
      await expect(page.getByText("El producto quedó guardado como oculto.", { exact: true })).toHaveCount(0)
      // Cancelar una edicion publicada tampoco oculta ni elimina.
      await conexion.db.update(producto).set({ publicado: true, version: 2, imagenAssetId: `asset-${creado.id}`, imagenPublicId: `pruebas/${creado.id}`, imagenVersionProveedor: "1", imagenUrlSegura: "https://example.test/imagen.png", imagenAncho: 12, imagenAlto: 8, imagenFormato: "png" }).where(eq(producto.id, creado.id))
      await page.goto(`/admin/productos/${creado.id}/editar`)
      await page.getByRole("button", { name: "Cancelar", exact: true }).click()
      await expect(page.getByText("El producto conserva su último estado guardado.", { exact: true })).toBeVisible()
      expect((await conexion.db.select().from(producto).where(eq(producto.id, creado.id)))[0]).toMatchObject({ publicado: true, version: 2 })
    } finally { await conexion.pool.end() }
  })
}
