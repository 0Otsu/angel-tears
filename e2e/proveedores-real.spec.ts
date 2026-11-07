import { expect, test } from "@playwright/test"
import { sql } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { borrarCuentaDePrueba, CONTRASENA_DE_PRUEBA, crearCuentaDePrueba, EMAIL_DE_PRUEBA, reiniciarLimiteDeIntentos } from "./apoyo/cuenta-de-prueba"

// Proveedores administrativos (tareas 3.1, 3.2 y 3.3) con servidor Next real, Auth real y la
// base de pruebas: alta, validacion, edicion, inactivacion y reactivacion, sin baja.

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
async function limpiar() {
  const conexion = con()
  try { await conexion.db.execute(sql`DELETE FROM proveedor WHERE nombre LIKE 'E2E %'`) } finally { await conexion.pool.end() }
}

test.beforeAll(async () => { await crearCuentaDePrueba(); await limpiar() })
test.beforeEach(limpiar)
test.afterAll(async () => { await limpiar(); await borrarCuentaDePrueba() })

for (const [vista, width, height] of [["desktop", 1280, 900], ["mobile", 390, 844]] as const) {
  test(`alta, edicion e inactivacion reales en ${vista}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await reiniciarLimiteDeIntentos()
    await page.goto("/admin/proveedores")
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
    await page.getByRole("button", { name: "Ingresar", exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)

    await page.goto("/admin/proveedores")
    await expect(page.getByText("Datos de demostración")).toHaveCount(0)
    await expect(page.getByText("Proveedor de accesorios A")).toHaveCount(0)

    // El nombre es obligatorio: error por campo, foco y datos conservados.
    await page.getByRole("button", { name: "Nuevo proveedor" }).first().click()
    const dialogo = page.getByRole("dialog")
    await dialogo.getByLabel("Instagram").fill("@e2e")
    await dialogo.getByRole("button", { name: "Crear proveedor" }).click()
    await expect(dialogo.getByText("El nombre es obligatorio.")).toBeVisible()
    await expect(dialogo.getByLabel("Nombre *")).toBeFocused()
    await expect(dialogo.getByLabel("Instagram")).toHaveValue("@e2e")

    await dialogo.getByLabel("Nombre *").fill("E2E Mayorista")
    await dialogo.getByRole("button", { name: "Crear proveedor" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const fila = page.getByRole("listitem").filter({ hasText: "E2E Mayorista" })
    await expect(fila).toContainText("Activo")
    await expect(fila).toContainText("Instagram: @e2e")

    // Edicion.
    await page.getByRole("button", { name: "Editar proveedor E2E Mayorista" }).click()
    await page.getByRole("dialog").getByLabel("Teléfono").fill("11 5555-0000")
    await page.getByRole("dialog").getByLabel("Nombre *").fill("E2E Mayorista Sur")
    await page.getByRole("dialog").getByRole("button", { name: "Guardar cambios" }).click()
    const editada = page.getByRole("listitem").filter({ hasText: "E2E Mayorista Sur" })
    await expect(editada).toContainText("Tel: 11 5555-0000")

    // Inactivar conserva el proveedor; se puede reactivar. No hay boton de eliminar.
    await expect(page.getByRole("button", { name: /elimin|borrar/i })).toHaveCount(0)
    await page.getByRole("button", { name: "Inactivar proveedor E2E Mayorista Sur" }).click()
    await expect(editada).toContainText("Inactivo")
    await page.getByLabel("Estado").selectOption("activos")
    await expect(editada).toHaveCount(0)
    await page.getByLabel("Estado").selectOption("inactivos")
    await expect(editada).toBeVisible()
    await page.getByRole("button", { name: "Reactivar proveedor E2E Mayorista Sur" }).click()
    await page.getByLabel("Estado").selectOption("")
    await expect(editada).toContainText("Activo")
  })
}
