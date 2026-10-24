import { expect, test, type Browser, type Page } from "@playwright/test"
import {
  CONTRASENA_DE_PRUEBA,
  EMAIL_DE_PRUEBA,
  borrarCuentaDePrueba,
  crearCuentaDePrueba,
  generarTokenDeRecuperacion,
  reiniciarLimiteDeIntentos,
  vencerEnlacesDeRecuperacion,
} from "./apoyo/cuenta-de-prueba"

// Recuperacion de contrasena por email (tareas 3.1 y 3.2) contra un Next real y la base de
// pruebas. El enlace es real (generado con Better Auth) pero no se envia ningun correo.
const NUEVA = "contrasena-e2e-recuperada-456"
const MENSAJE_NEUTRO = /si el correo corresponde a la cuenta/i

// Next tiene su propio role="alert" para anunciar cambios de ruta: se busca solo en el contenido.
const principal = (page: Page) => page.getByRole("main")

const rutaDelEnlace = (token: string) =>
  `/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent("/admin/restablecer")}`

async function iniciarSesion(page: Page, contrasena: string) {
  await page.goto("/admin/login")
  await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
  await page.getByLabel("Contraseña").fill(contrasena)
  await page.getByRole("button", { name: "Ingresar" }).click()
}

async function abrirDispositivoConSesion(browser: Browser) {
  const contexto = await browser.newContext()
  const page = await contexto.newPage()
  await iniciarSesion(page, CONTRASENA_DE_PRUEBA)
  await expect(page).toHaveURL(/\/admin$/)
  return { contexto, page }
}

async function elegirContrasena(page: Page, nueva: string, confirmacion = nueva) {
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(nueva)
  await page.getByLabel("Repetir contraseña nueva").fill(confirmacion)
  await page.getByRole("button", { name: "Cambiar contraseña" }).click()
}

test.describe("recuperacion de contrasena", () => {
  test.beforeEach(async () => {
    await crearCuentaDePrueba()
    await reiniciarLimiteDeIntentos()
  })

  test.afterAll(async () => {
    await borrarCuentaDePrueba()
  })

  test("desde el login se llega a la pagina de recuperacion", async ({ page }) => {
    await page.goto("/admin/login")

    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click()

    await expect(page).toHaveURL(/\/admin\/recuperar$/)
    await expect(page.getByRole("heading", { name: "Recuperar contraseña" })).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  })

  test("el pedido responde lo mismo para un correo de la cuenta y para uno que no existe", async ({ page }) => {
    await page.goto("/admin/recuperar")

    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByRole("button", { name: "Enviarme el enlace" }).click()
    const paraLaCuenta = await page.getByRole("status").innerText()

    await page.reload()
    await page.getByLabel("Correo electrónico").fill("nadie@ejemplo.com")
    await page.getByRole("button", { name: "Enviarme el enlace" }).click()
    const paraOtroCorreo = await page.getByRole("status").innerText()

    expect(paraLaCuenta).toMatch(MENSAJE_NEUTRO)
    expect(paraOtroCorreo).toBe(paraLaCuenta)
  })

  test("un correo mal escrito se senala sin enviar nada", async ({ page }) => {
    await page.goto("/admin/recuperar")

    await page.getByLabel("Correo electrónico").fill("esto-no-es-un-correo")
    await page.getByRole("button", { name: "Enviarme el enlace" }).click()

    await expect(page.getByText("Ingresá un correo válido.")).toBeVisible()
    await expect(page.getByRole("status")).toHaveCount(0)
  })

  test("con el enlace del correo se elige la contrasena nueva, se cierran las sesiones y no se inicia sesion sola", async ({
    browser,
    page,
    context,
  }) => {
    const otroDispositivo = await abrirDispositivoConSesion(browser)
    try {
      const token = await generarTokenDeRecuperacion()

      // El enlace del correo pasa por Better Auth, que redirige al formulario con el token.
      await page.goto(rutaDelEnlace(token))
      await expect(page).toHaveURL(new RegExp(`/admin/restablecer\\?token=${token}$`))
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer")
      await elegirContrasena(page, NUEVA)

      await expect(page.getByRole("status")).toContainText("cerramos todas tus sesiones")
      // No quedo ninguna sesion iniciada en este navegador...
      expect((await context.cookies()).some((c) => /session_token/.test(c.name) && c.value !== "")).toBe(false)
      await page.goto("/admin")
      await expect(page).toHaveURL(/\/admin\/login$/)
      // ...y la sesion que ya estaba abierta en otro dispositivo quedo cerrada.
      await otroDispositivo.page.goto("/admin/stock")
      await expect(otroDispositivo.page).toHaveURL(/\/admin\/login$/)

      // La contrasena vieja ya no entra; la nueva si.
      await reiniciarLimiteDeIntentos()
      await iniciarSesion(page, CONTRASENA_DE_PRUEBA)
      await expect(page.getByRole("alert").filter({ hasText: "no son correctos" })).toBeVisible()
      await page.getByLabel("Contraseña").fill(NUEVA)
      await page.getByRole("button", { name: "Ingresar" }).click()
      await expect(page).toHaveURL(/\/admin$/)
    } finally {
      await otroDispositivo.contexto.close()
    }
  })

  test("el enlace sirve una sola vez", async ({ page }) => {
    const token = await generarTokenDeRecuperacion()
    await page.goto(rutaDelEnlace(token))
    await elegirContrasena(page, NUEVA)
    await expect(page.getByRole("status")).toBeVisible()

    await page.goto(rutaDelEnlace(token))

    await expect(page).toHaveURL(/\/admin\/restablecer\?error=INVALID_TOKEN/)
    await expect(principal(page).getByRole("alert")).toContainText("no es válido o ya venció")
    await expect(page.getByLabel("Contraseña nueva", { exact: true })).toHaveCount(0)
  })

  test("un enlace vencido muestra que no es valido y ofrece pedir uno nuevo", async ({ page }) => {
    const token = await generarTokenDeRecuperacion()
    await vencerEnlacesDeRecuperacion()

    await page.goto(rutaDelEnlace(token))

    await expect(principal(page).getByRole("alert")).toContainText("no es válido o ya venció")
    await page.getByRole("link", { name: "Pedir un enlace nuevo" }).click()
    await expect(page).toHaveURL(/\/admin\/recuperar$/)
  })

  test("sin token, o con un token que no existe, el enlace no sirve", async ({ page }) => {
    await page.goto("/admin/restablecer")
    await expect(principal(page).getByRole("alert")).toContainText("no es válido o ya venció")

    await page.goto("/admin/restablecer?token=un-token-que-no-existe")
    await elegirContrasena(page, NUEVA)

    await expect(principal(page).getByRole("alert")).toContainText("no es válido o ya venció")
  })

  test("una contrasena nueva demasiado corta no gasta el enlace: se puede corregir y seguir", async ({ page }) => {
    const token = await generarTokenDeRecuperacion()
    await page.goto(rutaDelEnlace(token))

    await elegirContrasena(page, "corta")
    await expect(page.getByText(/al menos 8 caracteres/i)).toBeVisible()
    await elegirContrasena(page, NUEVA)

    await expect(page.getByRole("status")).toContainText("cambiaste tu contraseña")
  })
})
