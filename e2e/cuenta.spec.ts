import { expect, test, type Browser, type Page } from "@playwright/test"
import {
  CONTRASENA_DE_PRUEBA,
  EMAIL_DE_PRUEBA,
  borrarCuentaDePrueba,
  crearCuentaDePrueba,
  reiniciarLimiteDeIntentos,
} from "./apoyo/cuenta-de-prueba"

// Pagina /admin/cuenta (tareas 3.3 y 3.5) contra un Next real y la base de pruebas: datos de solo
// lectura, cambio de contrasena con la politica del 21/10 (se conserva esta sesion y se cierran
// las demas) y cierre de sesion. Cada test parte de la cuenta original.
const NUEVA = "contrasena-e2e-nueva-456"

async function intentarIniciarSesion(page: Page, contrasena: string) {
  await page.goto("/admin/login")
  await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
  await page.getByLabel("Contraseña").fill(contrasena)
  await page.getByRole("button", { name: "Ingresar" }).click()
}

// Inicia sesion con la contrasena original y espera a llegar al panel: si el test navegara antes,
// cortaria el pedido de login en vuelo y la sesion no llegaria a crearse.
async function iniciarSesionPorLaInterfaz(page: Page) {
  await intentarIniciarSesion(page, CONTRASENA_DE_PRUEBA)
  await expect(page).toHaveURL(/\/admin$/)
}

async function abrirDispositivo(browser: Browser) {
  const contexto = await browser.newContext()
  const page = await contexto.newPage()
  await iniciarSesionPorLaInterfaz(page)
  return { contexto, page }
}

async function cambiarContrasenaEn(page: Page, actual: string, nueva: string, confirmacion = nueva) {
  await page.getByLabel("Contraseña actual").fill(actual)
  await page.getByLabel("Contraseña nueva", { exact: true }).fill(nueva)
  await page.getByLabel("Repetir contraseña nueva").fill(confirmacion)
  await page.getByRole("button", { name: "Cambiar contraseña" }).click()
}

test.describe("cuenta de la Administradora", () => {
  test.beforeEach(async () => {
    await crearCuentaDePrueba()
    await reiniciarLimiteDeIntentos()
  })

  test.afterAll(async () => {
    await borrarCuentaDePrueba()
  })

  test("se llega desde el menu y muestra nombre y correo de solo lectura, sin edicion de identidad", async ({ page }) => {
    await iniciarSesionPorLaInterfaz(page)

    await page.getByRole("link", { name: "Cuenta" }).click()

    await expect(page).toHaveURL(/\/admin\/cuenta$/)
    await expect(page.getByRole("heading", { name: "Cuenta" })).toBeVisible()
    const principal = page.getByRole("main")
    await expect(principal.getByText("Administradora de prueba")).toBeVisible()
    await expect(principal.getByText(EMAIL_DE_PRUEBA)).toBeVisible()
    // Solo hay campos de contrasena: nada para editar nombre, correo ni roles.
    await expect(principal.locator('input:not([type="password"])')).toHaveCount(0)
    await expect(principal.getByRole("button", { name: "Cambiar contraseña" })).toBeVisible()
    await expect(principal.getByRole("button", { name: "Cerrar sesión" })).toBeVisible()
  })

  test("con la contrasena actual incorrecta muestra el error en ese campo y la sesion sigue abierta", async ({ page }) => {
    await iniciarSesionPorLaInterfaz(page)
    await page.goto("/admin/cuenta")

    await cambiarContrasenaEn(page, "contrasena-equivocada-999", NUEVA)

    await expect(page.getByText("La contraseña actual no es correcta.")).toBeVisible()
    await expect(page.getByLabel("Contraseña actual")).toHaveValue("")
    await page.reload()
    await expect(page).toHaveURL(/\/admin\/cuenta$/)
  })

  test("con una confirmacion distinta no envia nada y marca el campo", async ({ page }) => {
    await iniciarSesionPorLaInterfaz(page)
    await page.goto("/admin/cuenta")

    await cambiarContrasenaEn(page, CONTRASENA_DE_PRUEBA, NUEVA, "otra-distinta-789")

    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible()
    await expect(page.getByLabel("Repetir contraseña nueva")).toHaveAttribute("aria-invalid", "true")
  })

  test("al cambiar la contrasena esta sesion sigue abierta y se cierra la de otro dispositivo", async ({ browser }) => {
    const actual = await abrirDispositivo(browser)
    const otro = await abrirDispositivo(browser)
    try {
      await actual.page.goto("/admin/cuenta")

      await cambiarContrasenaEn(actual.page, CONTRASENA_DE_PRUEBA, NUEVA)

      await expect(actual.page.getByRole("status")).toContainText("cerramos tus otras sesiones")
      // Esta sesion sigue valiendo: recargar no pide el login.
      await actual.page.reload()
      await expect(actual.page).toHaveURL(/\/admin\/cuenta$/)
      // La del otro dispositivo se cerro: ahi se pide el login.
      await otro.page.goto("/admin/stock")
      await expect(otro.page).toHaveURL(/\/admin\/login$/)
    } finally {
      await actual.contexto.close()
      await otro.contexto.close()
    }
  })

  test("despues del cambio solo entra la contrasena nueva", async ({ page }) => {
    await iniciarSesionPorLaInterfaz(page)
    await page.goto("/admin/cuenta")
    await cambiarContrasenaEn(page, CONTRASENA_DE_PRUEBA, NUEVA)
    await expect(page.getByRole("status")).toBeVisible()
    await page.getByRole("main").getByRole("button", { name: "Cerrar sesión" }).click()
    await expect(page).toHaveURL(/\/admin\/login$/)
    await reiniciarLimiteDeIntentos()

    // La contrasena vieja ya no entra...
    await intentarIniciarSesion(page, CONTRASENA_DE_PRUEBA)
    await expect(page.getByRole("alert").filter({ hasText: "no son correctos" })).toBeVisible()
    // ...y la nueva si.
    await page.getByLabel("Contraseña").fill(NUEVA)
    await page.getByRole("button", { name: "Ingresar" }).click()

    await expect(page).toHaveURL(/\/admin$/)
  })

  test("cerrar sesion desde la pagina de cuenta lleva al login", async ({ page }) => {
    await iniciarSesionPorLaInterfaz(page)
    await page.goto("/admin/cuenta")

    await page.getByRole("main").getByRole("button", { name: "Cerrar sesión" }).click()

    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.goto("/admin/cuenta")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })
})
