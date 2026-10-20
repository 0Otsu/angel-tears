import { expect, test } from "@playwright/test"

// Humo del acceso administrativo contra un Next real. Hoy el login es un mock: aqui solo se
// comprueba lo que ya es cierto (la pagina de acceso existe, se ve bien y no se indexa).
// Los recorridos de login, proteccion de /admin, sesion y recuperacion se agregan junto con
// cada tarea de implementacion (2.3, 2.4, 2.5 y 3.x).
test.describe("pagina de acceso administrativo", () => {
  test("carga con su formulario y no se indexa", async ({ page }) => {
    const respuesta = await page.goto("/admin/login")

    expect(respuesta?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Panel de administración" })).toBeVisible()
    await expect(page.getByLabel("Contraseña")).toHaveAttribute("type", "password")
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  })
})
