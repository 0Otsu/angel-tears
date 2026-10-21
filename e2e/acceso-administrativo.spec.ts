import { expect, test } from "@playwright/test"
import {
  CONTRASENA_DE_PRUEBA,
  EMAIL_DE_PRUEBA,
  borrarCuentaDePrueba,
  crearCuentaDePrueba,
} from "./apoyo/cuenta-de-prueba"

// Login de la Administradora contra un Next real y la base de pruebas, con una cuenta real
// sembrada. Los recorridos de proteccion de /admin, sesion (30 dias) y logout se agregan con
// las tareas 2.4 y 2.5, y los de recuperacion con las 3.x.
test.describe("acceso administrativo", () => {
  test.beforeAll(async () => {
    await crearCuentaDePrueba()
  })

  test.afterAll(async () => {
    await borrarCuentaDePrueba()
  })

  test("la pagina de acceso carga con su formulario y no se indexa", async ({ page }) => {
    const respuesta = await page.goto("/admin/login")

    expect(respuesta?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible()
    await expect(page.getByLabel("Contraseña")).toHaveAttribute("type", "password")
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  })

  test("con credenciales incorrectas muestra un error neutro y no inicia sesion", async ({ page, context }) => {
    await page.goto("/admin/login")
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña").fill("contrasena-equivocada-999")
    await page.getByRole("button", { name: "Ingresar" }).click()

    // Se acota al formulario: Next tiene su propio role="alert" para anunciar cambios de ruta.
    const formulario = page.getByRole("form", { name: "Acceso administrativo" })
    await expect(formulario.getByRole("alert")).toHaveText("El correo o la contraseña no son correctos.")
    await expect(page).toHaveURL(/\/admin\/login$/)
    // Se conserva el correo, se borra la contrasena y no hay cookie de sesion.
    await expect(page.getByLabel("Correo electrónico")).toHaveValue(EMAIL_DE_PRUEBA)
    await expect(page.getByLabel("Contraseña")).toHaveValue("")
    expect((await context.cookies()).some((c) => /session_token/.test(c.name))).toBe(false)
  })

  test("con credenciales correctas inicia una sesion real y entra al panel", async ({ page, context }) => {
    await page.goto("/admin/login")
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña").fill(CONTRASENA_DE_PRUEBA)
    await page.getByRole("button", { name: "Ingresar" }).click()

    await expect(page).toHaveURL(/\/admin$/)
    const cookies = await context.cookies()
    const sesion = cookies.find((c) => /session_token/.test(c.name))
    expect(sesion, "cookie de sesion").toBeDefined()
    expect(sesion?.httpOnly).toBe(true)
    expect(sesion?.sameSite).toBe("Lax")
  })
})
