import { expect, test } from "@playwright/test"
import { eq } from "drizzle-orm"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { user } from "../lib/infraestructura/esquemas/auth"
import { crearDatosFinanzas, limpiarDatosFinanzas } from "../pruebas/datos-finanzas"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearCuentaDePrueba, borrarCuentaDePrueba, reiniciarLimiteDeIntentos, EMAIL_DE_PRUEBA, CONTRASENA_DE_PRUEBA } from "./apoyo/cuenta-de-prueba"

const conexion = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
let actorId: string
test.beforeAll(async () => {
  const c = conexion()
  try { await migrate(c.db, { migrationsFolder: "./drizzle" }) } finally { await c.pool.end() }
  await crearCuentaDePrueba()
  const datos = conexion()
  try {
    const [actor] = await datos.db.select({ id: user.id }).from(user).where(eq(user.email, EMAIL_DE_PRUEBA))
    actorId = actor.id
    await crearDatosFinanzas(datos.db, actorId)
  } finally { await datos.pool.end() }
})
test.afterAll(async () => {
  if (actorId) {
    const c = conexion()
    try { await limpiarDatosFinanzas(c.db, actorId) } finally { await c.pool.end() }
  }
  await borrarCuentaDePrueba()
})

for (const [vista, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]] as const) {
  test(`resumen económico, períodos e indicadores coherentes en ${vista}`, async ({ page }, testInfo) => {
    const errores: string[] = []
    page.on("pageerror", error => errores.push(error.name))
    await reiniciarLimiteDeIntentos()
    await page.setViewportSize({ width, height })
    await page.goto("/admin/finanzas")
    await expect(page).toHaveURL(/\/admin\/login/)
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
    await page.getByRole("button", { name: "Ingresar", exact: true }).click()
    await page.waitForURL("**/admin")
    await page.goto("/admin?modo=mes&mes=2020-01")
    const indicadores = page.getByRole("region", { name: "Indicadores financieros" })
    await expect(indicadores).toContainText("ARS $ 5,00")
    await expect(page.getByRole("region",{name:"Elegir período"})).toBeVisible()
    await expect(page.getByRole("heading", { name: "Reposición pendiente" })).toBeVisible()
    await expect(page.getByRole("link", { name: /^Pocas unidades/ })).toHaveAttribute("href", "/admin/productos?stock=pocas")
    await page.screenshot({ path: testInfo.outputPath(`dashboard-${vista}.png`), fullPage: true })
    await page.goto("/admin/finanzas?modo=mes&mes=2020-01")
    await expect(indicadores).toContainText("ARS $ 5,00")
    await expect(indicadores).toContainText("ARS $ 10,30")
    await expect(page.getByText(/demostración|datos mock/i)).toHaveCount(0)
    await expect(page.locator(".recharts-bar-rectangle path").first()).toBeVisible()
    await expect(page).toHaveURL(/\/admin\?modo=mes&mes=2020-01/)
    await page.getByText("Consultar compras y gastos juntos", {exact:true}).click()
    const historia = width >= 768 ? page.getByRole("table", { name: "Compras y gastos del período" }) : page.getByRole("list", { name: "Compras y gastos del período" })
    await expect(historia.getByText("Anulado · excluido", { exact: true })).toHaveCount(2)
    await expect(historia.getByText("Gasto", { exact: true })).toHaveCount(2)
    await expect(historia.getByText("Compra", { exact: true })).toHaveCount(2)
    await page.screenshot({ path: testInfo.outputPath(`finanzas-${vista}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)

    await page.getByText("Ver datos del gráfico", { exact: true }).click()
    await expect(page.getByRole("table", { name: "Datos de evolución financiera" })).toContainText("31/01/2020")
    await page.getByLabel("Tipo de operación").selectOption("egresos")
    await page.getByLabel("Estado", { exact: true }).selectOption("anulado")
    await page.getByRole("button", { name: "Filtrar operaciones" }).click()
    await expect(historia.getByText("Gasto", { exact: true })).toHaveCount(1)
    await expect(historia.getByText("Compra", { exact: true })).toHaveCount(0)
    await expect(indicadores).toContainText("ARS $ 5,00")

    await page.getByText("Otros períodos", {exact:true}).click()
    await page.getByLabel("Período", {exact:true}).selectOption("anio")
    await expect(page).toHaveURL(/modo=anio/)
    const tabla=page.getByRole("table",{name:"Datos de evolución financiera"})
    if(!await tabla.isVisible())await page.getByText("Ver datos del gráfico",{exact:true}).click()
    await expect(tabla.getByRole("row")).toHaveCount(13)
    await page.goto("/admin/finanzas?modo=semana&referencia=1800-01-01")
    await expect(page.getByText("No hay operaciones vigentes en este período.")).toBeVisible()
    await page.getByRole("button",{name:"Período siguiente"}).click()
    await expect(page).toHaveURL(/modo=semana&referencia=1800-01-06/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    expect(errores).toEqual([])
  })
}
