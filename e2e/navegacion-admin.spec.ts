import { expect, test } from "@playwright/test"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { crearCuentaDePrueba, borrarCuentaDePrueba, reiniciarLimiteDeIntentos, EMAIL_DE_PRUEBA, CONTRASENA_DE_PRUEBA } from "./apoyo/cuenta-de-prueba"
const raiz = createRequire(resolve("package.json"))
const a11y = createRequire(createRequire(raiz.resolve("eslint-config-next")).resolve("eslint-plugin-jsx-a11y"))
test.beforeAll(crearCuentaDePrueba)
test.afterAll(borrarCuentaDePrueba)
test.beforeEach(async ({ page }) => {
  await reiniciarLimiteDeIntentos(); await page.goto("/admin/login")
  await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA); await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
  await page.getByRole("button", { name: "Ingresar", exact: true }).click(); await expect(page).toHaveURL(/\/admin$/)
})
test("cinco destinos y navegacion secundaria accesible desktop/mobile sin mover modulos", async ({ page }, info) => {
  test.setTimeout(90000)
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/admin")
    if (width < 1024) await page.getByRole("button", { name: "Abrir navegación administrativa" }).click()
    const nav = page.getByRole("navigation", { name: "Módulos administrativos" })
    await expect(nav.getByRole("link")).toHaveText(["Resumen", "Productos", "Inventario", "Operaciones", "Finanzas"])
    await nav.getByRole("link", { name: "Operaciones", exact: true }).focus(); await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/admin\/ventas$/)
    if (width < 1024) await expect(page.getByRole("dialog")).toHaveCount(0)
    for (const [nombre, destino] of [["Compras", "compras"], ["Proveedores", "proveedores"], ["Ventas", "ventas"]]) {
      const link = page.getByRole("navigation", { name: "Navegación de Operaciones" }).getByRole("link", { name: nombre, exact: true })
      await link.focus(); await page.keyboard.press("Enter"); await expect(page).toHaveURL(new RegExp(`/admin/${destino}$`))
      await expect(link).toHaveAttribute("aria-current", "page")
    }
    await page.goto("/admin/egresos")
    await page.getByRole("navigation", { name: "Navegación de Finanzas" }).getByRole("link", { name: "Resumen financiero" }).click()
    await expect(page).toHaveURL(/\/admin\/finanzas$/)
    await expect(page.getByRole("heading", { name: "Resumen financiero", exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.addScriptTag({ path: a11y.resolve("axe-core/axe.min.js") })
    const violaciones = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (contexto: unknown, opciones: unknown) => Promise<{ violations: { id: string }[] }> } }).axe
      return (await axe.run({ include: ["header", "aside", "main > nav"] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => v.id)
    })
    expect(violaciones).toEqual([])
    const usuario = page.getByRole("button", { name: /^Menú de usuario:/ })
    await usuario.focus(); await page.keyboard.press("Enter")
    await expect(page.getByRole("menuitem", { name: "Mi cuenta" })).toBeFocused()
    await page.keyboard.press("Escape"); await expect(usuario).toBeFocused()
    await page.screenshot({ path: info.outputPath(`finanzas-${width}.png`), fullPage: true })
  }
})
test("deep links, redirect protegido y menu de usuario reutilizan Cuenta/logout reales", async ({ page }) => {
  await page.goto("/admin/reportes"); await expect(page).toHaveURL(/\/admin\/finanzas$/)
  for (const ruta of ["stock", "compras", "ventas", "proveedores", "egresos", "configuracion", "productos"]) {
    await page.goto(`/admin/${ruta}`); await expect(page).toHaveURL(new RegExp(`/admin/${ruta}$`))
  }
  await page.goto("/admin/stock"); await expect(page.getByRole("heading", { name: "Inventario", exact: true })).toBeVisible()
  const usuario = page.getByRole("button", { name: /^Menú de usuario:/ })
  await usuario.focus(); await page.keyboard.press("Enter")
  await expect(page.getByRole("menuitem", { name: "Mi cuenta" })).toBeFocused()
  await page.keyboard.press("Escape"); await expect(usuario).toBeFocused()
  await usuario.click(); await page.getByRole("menuitem", { name: "Mi cuenta" }).click()
  await expect(page).toHaveURL(/\/admin\/cuenta$/)
  await expect(page.getByRole("form", { name: "Cambiar contraseña" })).toBeVisible()
  await usuario.click(); await page.getByRole("menuitem", { name: "Cerrar sesión", exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  await page.goto("/admin/finanzas"); await expect(page).toHaveURL(/\/admin\/login$/)
})
