import { expect, test } from "@playwright/test"
import { like, sql } from "drizzle-orm"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { egreso } from "../lib/infraestructura/esquemas/egreso"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { crearCuentaDePrueba, borrarCuentaDePrueba, reiniciarLimiteDeIntentos, EMAIL_DE_PRUEBA, CONTRASENA_DE_PRUEBA } from "./apoyo/cuenta-de-prueba"

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
async function limpiar() {
  const c = con()
  try { await c.db.delete(egreso).where(like(egreso.concepto, "E2E Egreso %")) } finally { await c.pool.end() }
}
test.beforeAll(async () => {
  const c = con()
  try { await migrate(c.db, { migrationsFolder: "./drizzle" }) } finally { await c.pool.end() }
  await limpiar(); await crearCuentaDePrueba()
})
test.afterAll(async () => { await limpiar(); await borrarCuentaDePrueba() })

for (const [vista, width, height] of [["desktop", 1280, 900], ["mobile", 390, 844]] as const) {
  test(`registro, filtros, detalle y anulacion reales en ${vista}`, async ({ page }, testInfo) => {
    await reiniciarLimiteDeIntentos()
    await page.setViewportSize({ width, height })
    await page.goto("/admin/gastos")
    await expect(page).toHaveURL(/\/admin\/login/)
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
    await page.getByRole("button", { name: "Ingresar", exact: true }).click()
    await page.waitForURL("**/admin")
    await page.goto("/admin/gastos?desde=2020-01-01&hasta=2020-01-31")
    await expect(page.getByText("Datos de demostración · sin persistencia")).toHaveCount(0)
    await page.getByRole("button", { name: "Registrar gasto", exact: true }).click()
    const d = page.getByRole("dialog")
    const concepto = `E2E Egreso ${vista}`
    await d.getByLabel("Concepto *").fill(concepto)
    await d.getByLabel("Importe (ARS) *").fill("0.001")
    await d.getByLabel("Fecha de operación *").fill("2020-01-15")
    await d.getByLabel("Observación (opcional)").fill("Factura de servicio")
    await d.getByRole("button", { name: "Guardar gasto" }).click()
    await expect(d.getByLabel("Importe (ARS) *")).toBeFocused()
    await expect(d.getByLabel("Concepto *")).toHaveValue(concepto)
    await d.getByLabel("Importe (ARS) *").fill("1234.56")
    await d.getByRole("button", { name: "Guardar gasto" }).click()
    await expect(d).toHaveCount(0)
    const fila = page.getByRole("table", { name: "Gastos" }).getByRole("row").filter({ hasText: concepto })
    await expect(fila).toContainText("Confirmado")
    await expect(fila).toContainText("15/01/2020")
    await expect(fila).toContainText("1.234,56")
    await page.screenshot({ path: testInfo.outputPath(`egresos-${vista}.png`), fullPage: true })
    const c = con()
    try {
      const registros = await c.db.select().from(egreso).where(like(egreso.concepto, concepto))
      expect(registros).toHaveLength(1)
      expect(registros[0]).toMatchObject({ importe: "1234.56", fechaOperacion: "2020-01-15", nota: "Factura de servicio", estado: "CONFIRMADO" })
    } finally { await c.pool.end() }
    await fila.getByRole("button", { name: `Ver detalle de ${concepto}` }).click()
    await expect(d.getByRole("region", { name: "Historial del gasto" })).toContainText("Registrado:")
    await expect(d.getByText("Factura de servicio")).toBeVisible()
    await d.getByRole("button", { name: "Anular gasto", exact: true }).click()
    await d.getByRole("button", { name: "Confirmar anulación" }).click()
    await expect(d.getByText("Anulado", { exact: true })).toBeVisible()
    await expect(d.getByRole("region", { name: "Historial del gasto" })).toContainText("No integra los totales vigentes")
    await expect(d.getByRole("button", { name: "Anular gasto", exact: true })).toHaveCount(0)
    await page.keyboard.press("Escape")
    await page.getByLabel("Estado", { exact: true }).selectOption("CONFIRMADO")
    await expect(page).toHaveURL(/estado=CONFIRMADO/)
    await expect(fila).toHaveCount(0)
    await page.getByLabel("Estado", { exact: true }).selectOption("ANULADO")
    await expect(page).toHaveURL(/estado=ANULADO/)
    await expect(fila).toContainText("Anulado")
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    const final = con()
    try {
      const r = await final.db.execute(sql`SELECT estado, importe, anulado_en IS NOT NULL AS historial FROM egreso WHERE concepto=${concepto}`)
      expect(r.rows).toEqual([{ estado: "ANULADO", importe: "1234.56", historial: true }])
    } finally { await final.pool.end() }
  })
}
