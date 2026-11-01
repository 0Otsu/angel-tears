import { expect, test } from "@playwright/test"
import { eq, inArray } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { categoria, producto } from "../lib/infraestructura/esquemas/producto"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { CATEGORIAS_INICIALES, type CodigoCategoria } from "../lib/modulos/productos/categorias"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearImagenPrueba } from "../pruebas/imagenes-producto"
import { borrarCuentaDePrueba, CONTRASENA_DE_PRUEBA, crearCuentaDePrueba, EMAIL_DE_PRUEBA, reiniciarLimiteDeIntentos, vencerSesionesDePrueba } from "./apoyo/cuenta-de-prueba"

// Servidor Next real del arnes existente, exclusivamente sobre DATABASE_URL_TEST.
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
    await page.getByRole("button", { name: "Ingresar", exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await page.goto("/admin/productos")
    const formulario = page.getByRole("form")
    await expect(page.getByText("Datos de demostración · sin persistencia")).toHaveCount(0)
    await formulario.getByRole("button", { name: "Crear producto" }).click()
    await expect(page.getByLabel("Nombre *")).toBeFocused()
    const nombre = `Producto E2E ${nombreVista}`
    await page.getByLabel("Nombre *").fill(nombre)
    await page.getByLabel("Precio de venta (ARS) *").fill("0")
    await page.getByLabel("Categoría *").selectOption("collares")
    await formulario.getByRole("button", { name: "Crear producto" }).click()
    await expect(formulario.getByText("El precio debe ser mayor que cero.")).toBeVisible()
    await expect(page.getByLabel("Precio de venta (ARS) *")).toBeFocused()
    await page.getByLabel("Precio de venta (ARS) *").fill("1250.50")
    await page.getByLabel("Material", { exact: true }).fill("Acero")
    await formulario.getByRole("button", { name: "Crear producto" }).click()
    await expect(formulario.getByRole("status")).toHaveText("Producto guardado correctamente.")
    const fila = page.getByRole("row").filter({ hasText: nombre })
    await expect(fila.getByText("Oculto", { exact: true })).toBeVisible()
    const conexion = con()
    try {
      const [creado] = await conexion.db.select().from(producto).where(eq(producto.nombre, nombre))
      expect(creado).toBeDefined()
      ids.push(creado.id)
      expect(creado).toMatchObject({ precio: "1250.50", material: "Acero", publicado: false, destacado: false, imagenAssetId: null })
      const [saldo] = await conexion.db.select().from(inventario).where(eq(inventario.productoId, creado.id))
      expect(saldo).toMatchObject({ cantidad: 0, minimo: null })
      await fila.getByRole("button", { name: `Editar ${nombre}` }).click()
      await page.getByLabel("Nombre *").fill(`${nombre} editado`)
      await page.getByLabel("Precio de venta (ARS) *").fill("90071992547409.93")
      await page.getByRole("button", { name: "Guardar cambios" }).click()
      await expect(formulario.getByRole("status")).toBeVisible()
      await expect(page.getByRole("row").filter({ hasText: `${nombre} editado` })).toContainText("90071992547409.93")
      await page.reload()
      await expect(page.getByRole("row").filter({ hasText: `${nombre} editado` })).toContainText("90071992547409.93")
      const [editado] = await conexion.db.select().from(producto).where(eq(producto.id, creado.id))
      expect(editado).toMatchObject({ slug: creado.slug, version: 2, precio: "90071992547409.93", publicado: false })
      const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(desborde).toBe(false)
      await page.screenshot({ path: info.outputPath(`productos-${nombreVista}.png`), fullPage: true })
      await page.getByRole("button", { name: `Editar ${nombre} editado` }).click()
      const imagen = page.getByRole("region", { name: `Imagen de ${nombre} editado` })
      if (nombreVista === "desktop") {
        const origenAjeno = await page.request.post(`/api/admin/productos/${creado.id}/imagen`, { headers: { origin: "https://ajeno.test" }, multipart: { version: "2", imagen: { name: "collar.png", mimeType: "image/png", buffer: await crearImagenPrueba() } } })
        expect(origenAjeno.status()).toBe(403)
      }
      await imagen.getByLabel("Archivo de imagen principal").setInputFiles({ name: "collar.png", mimeType: "image/png", buffer: await crearImagenPrueba() })
      await expect(imagen.getByAltText(/Vista previa/)).toBeVisible()
      await imagen.getByRole("button", { name: "Subir imagen" }).click()
      await expect(imagen.getByRole("alert")).toContainText("La carga de imágenes no está disponible")
      await expect(imagen.getByAltText(/Vista previa/)).toBeVisible()
      await imagen.getByRole("button", { name: "Reintentar carga" }).click()
      await expect(imagen.getByRole("alert")).toContainText("La carga de imágenes no está disponible")
      expect((await conexion.db.select().from(producto).where(eq(producto.id, creado.id)))[0]).toMatchObject({ imagenAssetId: null, version: 2 })
      await imagen.screenshot({ path: info.outputPath(`primera-imagen-${nombreVista}.png`) })
      if (nombreVista === "desktop") {
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
