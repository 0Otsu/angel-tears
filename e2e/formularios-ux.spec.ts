import { expect, test } from "@playwright/test"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { writeFile } from "node:fs/promises"
import { eq } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { categoria, producto } from "../lib/infraestructura/esquemas/producto"
import { inventario } from "../lib/infraestructura/esquemas/inventario"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearCuentaDePrueba, borrarCuentaDePrueba, reiniciarLimiteDeIntentos, EMAIL_DE_PRUEBA, CONTRASENA_DE_PRUEBA } from "./apoyo/cuenta-de-prueba"

const nombre = `Formulario UX ${crypto.randomUUID()}`
const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
let categoriaCreada = false
// Reutiliza la auditoria ya disponible via ESLint, sin fijar una ruta interna de pnpm/version.
const resolverRaiz = createRequire(resolve("package.json"))
const resolverNext = createRequire(resolverRaiz.resolve("eslint-config-next"))
const rutaAxe = createRequire(resolverNext.resolve("eslint-plugin-jsx-a11y")).resolve("axe-core/axe.min.js")
test.beforeAll(async () => {
  await crearCuentaDePrueba(); const c = con()
  try {
    categoriaCreada = !(await c.db.select().from(categoria).where(eq(categoria.codigo, "collares"))).length
    await c.db.insert(categoria).values({ codigo: "collares", nombre: "Collares" }).onConflictDoNothing()
  } finally { await c.pool.end() }
})
test.afterAll(async () => {
  const c = con()
  try {
    const propios = await c.db.select({ id: producto.id }).from(producto).where(eq(producto.nombre, nombre))
    for (const p of propios) { await c.db.delete(inventario).where(eq(inventario.productoId, p.id)); await c.db.delete(producto).where(eq(producto.id, p.id)) }
    if (categoriaCreada) await c.db.delete(categoria).where(eq(categoria.codigo, "collares"))
  } finally { await c.pool.end(); await borrarCuentaDePrueba() }
})
test.beforeEach(async ({ page }) => {
  await reiniciarLimiteDeIntentos(); await page.goto("/admin/login")
  await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
  await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
  await page.getByRole("button", { name: "Ingresar", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/)
  await page.goto("/admin/productos/nuevo")
})

test("labels, required, errores asociados, teclado, zoom y accesibilidad responsive", async ({ page }, info) => {
  test.setTimeout(60000)
  const form = page.getByRole("form", { name: "Nuevo producto", exact: true })
  await expect(form.getByText("Nombre *", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Nombre *")).toHaveAttribute("required", "")
  await expect(page.getByLabel("Precio de venta (ARS) *")).toHaveAttribute("inputmode", "decimal")
  await expect(form.getByText(/Mayor que \$0/)).toHaveCount(0)
  await form.getByRole("button", { name: "Guardar y continuar", exact: true }).click()
  await expect(page.getByLabel("Nombre *")).toBeFocused()
  for (const campo of ["Nombre *", "Precio de venta (ARS) *", "Categoría *"]) {
    const input = page.getByLabel(campo); await expect(input).toHaveAttribute("aria-invalid", "true")
    const id = await input.getAttribute("aria-describedby"); expect(id).toBeTruthy(); await expect(page.locator(`[id="${id}"]`)).toBeVisible()
  }
  await page.getByLabel("Nombre *").fill("Pulsera Olivia")
  for (const label of ["Precio de venta (ARS) *", "Descripción", "Material", "Medidas", "Color", "Cuidados", "Categoría *"]) {
    await page.keyboard.press("Tab"); const input = page.getByLabel(label); await expect(input).toBeFocused()
    expect(await input.evaluate(e => { const c = getComputedStyle(e); return c.boxShadow !== "none" || c.outlineStyle !== "none" })).toBe(true)
  }
  const primeraCategoria = await page.getByLabel("Categoría *").locator("option").nth(1).getAttribute("value")
  await page.keyboard.press("ArrowDown"); await expect(page.getByLabel("Categoría *")).toHaveValue(primeraCategoria!)
  await page.getByLabel("Precio de venta (ARS) *").fill("33000,555")
  await form.getByRole("button", { name: "Guardar y continuar", exact: true }).click()
  await expect(form.getByText("El precio admite hasta dos decimales.", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Precio de venta (ARS) *")).toBeFocused()
  await page.addScriptTag({ path: rutaAxe })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.evaluate(async () => { await document.fonts.ready })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    const errores = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (element: Element, options: unknown) => Promise<{ violations: { id: string }[] }> } }).axe
      return (await axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => v.id)
    })
    expect(errores).toEqual([])
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: info.outputPath(`formulario-${width}.png`), fullPage: true })
  }
  // 1280 px a 200% equivale a un viewport de layout de 640 px; verifica reflow sin ocultar campos.
  await page.setViewportSize({ width: 640, height: 500 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await expect(form.getByText("Cuidados", { exact: true })).toBeVisible()
  const arbol = info.outputPath("arbol-accesible.yml")
  await writeFile(arbol, await form.ariaSnapshot())
  await info.attach("arbol-accesible", { path: arbol, contentType: "text/plain" })
})

test("coma decimal persiste exacta en alta/edicion y filtros conservan labels visibles", async ({ page }) => {
  await page.getByLabel("Nombre *").fill(nombre)
  await page.getByLabel("Precio de venta (ARS) *").fill("33000,50")
  await page.getByLabel("Descripción", { exact: true }).fill("Pulsera regulable\ncon detalles dorados")
  await page.getByLabel("Categoría *").selectOption("collares")
  await page.getByRole("button", { name: "Guardar y continuar", exact: true }).click(); await expect(page).toHaveURL(/\/editar\?paso=imagen&alta=1$/)
  const c = con()
  try {
    const [antes] = await c.db.select().from(producto).where(eq(producto.nombre, nombre))
    expect(antes).toMatchObject({ precio: "33000.50", publicado: false, destacado: false, version: 1 })
    expect(antes.descripcion?.split(/\r?\n/)).toEqual(["Pulsera regulable", "con detalles dorados"])
    await page.getByRole("button", { name: "1. Datos", exact: true }).click()
    await page.getByLabel("Precio de venta (ARS) *").fill("23000,75")
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click(); await expect(page.getByText("Cambios guardados.", { exact: true })).toBeVisible()
    const [despues] = await c.db.select().from(producto).where(eq(producto.id, antes.id))
    expect(despues).toMatchObject({ precio: "23000.75", slug: antes.slug, publicado: false, destacado: false, version: 2 })
    await page.getByRole("button", { name: "3. Vista previa", exact: true }).click()
    await expect(page.getByRole("region", { name: "Detalle del producto", exact: true }).getByText("$23.000,75", { exact: true })).toBeVisible()
    await page.goto("/admin/productos")
    for (const label of ["Buscar por nombre", "Categoría", "Estado"]) await expect(page.getByText(label, { exact: true })).toBeVisible()
    await page.getByLabel("Buscar por nombre").fill(nombre)
    await expect(page.getByRole("heading", { name: nombre, exact: true })).toBeVisible()
    await expect(page.getByText("$23.000,75", { exact: true })).toBeVisible()
  } finally { await c.pool.end() }
})
