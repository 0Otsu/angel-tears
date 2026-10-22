import { expect, test, type Page } from "@playwright/test"
import {
  CONTRASENA_DE_PRUEBA,
  EMAIL_DE_PRUEBA,
  borrarCuentaDePrueba,
  crearCuentaDePrueba,
  reiniciarLimiteDeIntentos,
  vencerSesionesDePrueba,
} from "./apoyo/cuenta-de-prueba"

// Proteccion del panel contra un Next real y la base de pruebas (tareas 2.4 y 2.5): acceso
// directo sin sesion, login, sesion vencida, cookie manipulada y cierre de sesion.

const RUTAS_DEL_PANEL = [
  "/admin",
  "/admin/productos",
  "/admin/stock",
  "/admin/proveedores",
  "/admin/compras",
  "/admin/ventas",
  "/admin/egresos",
  "/admin/reportes",
  "/admin/configuracion",
]

// El shell del panel tiene esta navegacion; el login no. Si aparece, se entrego el panel.
const navegacionDelPanel = (page: Page) => page.getByRole("navigation", { name: "Módulos administrativos" })

async function iniciarSesionPorLaInterfaz(page: Page) {
  await page.goto("/admin/login")
  await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
  await page.getByLabel("Contraseña").fill(CONTRASENA_DE_PRUEBA)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

test.describe("proteccion del panel de administracion", () => {
  test.beforeAll(async () => {
    await crearCuentaDePrueba()
  })

  test.beforeEach(async () => {
    await reiniciarLimiteDeIntentos()
  })

  test.afterAll(async () => {
    await borrarCuentaDePrueba()
  })

  for (const ruta of RUTAS_DEL_PANEL) {
    test(`sin sesion, abrir ${ruta} directo lleva al login y no entrega el panel`, async ({ page }) => {
      await page.goto(ruta)

      await expect(page).toHaveURL(/\/admin\/login$/)
      await expect(navegacionDelPanel(page)).toHaveCount(0)
      await expect(page.getByLabel("Contraseña")).toBeVisible()
    })
  }

  test("con sesion se puede usar el panel y se ve la identidad real, no un usuario de muestra", async ({ page }) => {
    await iniciarSesionPorLaInterfaz(page)

    await expect(navegacionDelPanel(page)).toBeVisible()
    // Exacto: el correo tambien figura en un texto solo para lectores de pantalla ("nombre · correo").
    await expect(page.getByText(EMAIL_DE_PRUEBA, { exact: true })).toBeVisible()
    await expect(page.getByText(/usuario mock/i)).toHaveCount(0)
    await page.goto("/admin/stock")
    await expect(page).toHaveURL(/\/admin\/stock$/)
    await expect(navegacionDelPanel(page)).toBeVisible()
  })

  test("una Administradora ya autenticada que abre el login termina en el panel", async ({ page }) => {
    await iniciarSesionPorLaInterfaz(page)

    await page.goto("/admin/login")

    await expect(page).toHaveURL(/\/admin$/)
    await expect(navegacionDelPanel(page)).toBeVisible()
  })

  test("con la sesion vencida el acceso directo vuelve a pedir el login", async ({ page }) => {
    await iniciarSesionPorLaInterfaz(page)
    await vencerSesionesDePrueba()

    await page.goto("/admin/productos")

    await expect(page).toHaveURL(/\/admin\/login$/)
    await expect(navegacionDelPanel(page)).toHaveCount(0)
  })

  test("una cookie de sesion manipulada no da acceso", async ({ page, context }) => {
    await iniciarSesionPorLaInterfaz(page)
    const cookies = await context.cookies()
    const sesion = cookies.find((c) => /session_token/.test(c.name))
    expect(sesion).toBeDefined()
    await context.addCookies([{ ...sesion!, value: "valor-manipulado-que-no-es-un-token" }])

    await page.goto("/admin")

    await expect(page).toHaveURL(/\/admin\/login$/)
    await expect(navegacionDelPanel(page)).toHaveCount(0)
  })

  test("cerrar sesion invalida el acceso: volver o abrir el panel pide el login", async ({ page, context }) => {
    await iniciarSesionPorLaInterfaz(page)

    await page.getByRole("button", { name: "Cerrar sesión" }).click()

    await expect(page).toHaveURL(/\/admin\/login$/)
    expect((await context.cookies()).some((c) => /session_token/.test(c.name) && c.value !== "")).toBe(false)
    await page.goBack()
    await expect(page).toHaveURL(/\/admin\/login$/)
    await expect(navegacionDelPanel(page)).toHaveCount(0)
    await page.goto("/admin/ventas")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })
})
