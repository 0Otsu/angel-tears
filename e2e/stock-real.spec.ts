import { expect, test } from "@playwright/test"
import { eq, inArray } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "../lib/infraestructura/esquemas/inventario"
import { categoria, producto } from "../lib/infraestructura/esquemas/producto"
import { CATEGORIAS_INICIALES, type CodigoCategoria } from "../lib/modulos/productos/categorias"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { borrarCuentaDePrueba, CONTRASENA_DE_PRUEBA, crearCuentaDePrueba, EMAIL_DE_PRUEBA, reiniciarLimiteDeIntentos } from "./apoyo/cuenta-de-prueba"

// Inventario administrativo (tareas 2.2 y 2.5) con servidor Next real, Auth real y la base de
// pruebas: ajustes, stock insuficiente, minimo, estados e historial.

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
const ID = "e2e00000-0000-4000-8000-000000000001"
const NOMBRE = "Anillo E2E Inventario"
let categoriasAgregadas: CodigoCategoria[] = []

async function limpiarProducto() {
  const conexion = con()
  try {
    await conexion.db.delete(movimientoStock).where(inArray(movimientoStock.productoId, [ID]))
    await conexion.db.delete(ajusteStock).where(inArray(ajusteStock.productoId, [ID]))
    await conexion.db.delete(inventario).where(inArray(inventario.productoId, [ID]))
    await conexion.db.delete(producto).where(inArray(producto.id, [ID]))
  } finally { await conexion.pool.end() }
}

test.beforeAll(async () => {
  await crearCuentaDePrueba()
  await limpiarProducto()
  const conexion = con()
  try {
    const anteriores = await conexion.db.select().from(categoria)
    categoriasAgregadas = CATEGORIAS_INICIALES.map((c) => c.codigo).filter((codigo) => !anteriores.some((c) => c.codigo === codigo))
    await conexion.db.insert(categoria).values(CATEGORIAS_INICIALES.map((c) => ({ ...c }))).onConflictDoNothing()
    // Mismo estado que deja el alta real: producto oculto con saldo 0 y sin minimo.
    await conexion.db.insert(producto).values({ id: ID, slug: "anillo-e2e-inventario", nombre: NOMBRE, precio: "10.00", categoriaCodigo: "collares", publicado: false, destacado: false })
    await conexion.db.insert(inventario).values({ productoId: ID })
  } finally { await conexion.pool.end() }
})
// Cada vista parte del alta recien hecha: saldo 0, sin minimo y sin historial.
test.beforeEach(async () => {
  const conexion = con()
  try {
    await conexion.db.delete(movimientoStock).where(eq(movimientoStock.productoId, ID))
    await conexion.db.delete(ajusteStock).where(eq(ajusteStock.productoId, ID))
    await conexion.db.update(inventario).set({ cantidad: 0, minimo: null }).where(eq(inventario.productoId, ID))
  } finally { await conexion.pool.end() }
})
test.afterAll(async () => {
  await limpiarProducto()
  if (categoriasAgregadas.length) {
    const conexion = con()
    try { await conexion.db.delete(categoria).where(inArray(categoria.codigo, categoriasAgregadas)) } finally { await conexion.pool.end() }
  }
  await borrarCuentaDePrueba()
})

for (const [vista, width, height] of [["desktop", 1280, 900], ["mobile", 390, 844]] as const) {
  test(`ajustes, alertas generales e historial reales en ${vista}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await reiniciarLimiteDeIntentos()
    await page.goto("/admin/stock")
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
    await page.getByRole("button", { name: "Ingresar", exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)

    await page.goto("/admin/stock")
    await expect(page.getByText("Datos de demostración")).toHaveCount(0)
    const tarjeta = page.getByRole("table", { name: "Inventario por producto" }).getByRole("row").filter({ hasText: NOMBRE })
    await expect(tarjeta).toContainText("Sin stock")

    // Un decremento con saldo 0 se rechaza y conserva el formulario.
    await page.getByRole("button", { name: `Modificar stock de ${NOMBRE}` }).click()
    const dialogo = page.getByRole("dialog")
    await dialogo.getByRole("radio", {name:"Retirar"}).check()
    await dialogo.getByLabel("Cantidad *").fill("1")
    await dialogo.getByLabel("Motivo *").fill("Prueba")
    await expect(dialogo.getByRole("button", { name: "Registrar ajuste" })).toBeDisabled()
    await expect(dialogo.getByRole("status")).toContainText("no alcanza")
    await expect(dialogo.getByLabel("Motivo *")).toHaveValue("Prueba")

    // Validacion por campo con foco en el primero con error.
    await dialogo.getByRole("radio", {name:"Agregar"}).check()
    await dialogo.getByLabel("Cantidad *").fill("0")
    await dialogo.getByRole("button", { name: "Registrar ajuste" }).click()
    await expect(dialogo.getByText("Ingresá una cantidad entera mayor a cero.")).toBeVisible()
    await expect(dialogo.getByLabel("Cantidad *")).toBeFocused()

    // Incremento real por existencias previas (el backend conserva tambien INICIAL).
    await dialogo.getByRole("radio", {name:"Agregar"}).check()
    await dialogo.getByLabel("Cantidad *").fill("4")
    await dialogo.getByLabel("Motivo *").fill("Existencias previas")
    await dialogo.getByRole("button", { name: "Registrar ajuste" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(tarjeta.getByRole("cell").filter({ hasText: /^4\s*unidades/ })).toBeVisible()
    await expect(tarjeta).not.toContainText("Sin stock")

    // Cuatro disponible -> tres pocas, bajo el umbral general y sin configurar minimos.
    await expect(tarjeta).toContainText("Disponible")
    await expect(tarjeta).not.toContainText("Mínimo:")
    await page.getByRole("button", {name:`Más acciones de ${NOMBRE}`}).click()
    await expect(page.getByRole("menuitem", {name:"Configurar mínimo"})).toHaveCount(0)
    await page.keyboard.press("Escape")
    await page.getByRole("button", {name:`Modificar stock de ${NOMBRE}`}).click()
    await dialogo.getByRole("radio", {name:"Retirar"}).check()
    await dialogo.getByLabel("Cantidad *").fill("1")
    await dialogo.getByLabel("Motivo *").fill("Control de prueba")
    await dialogo.getByRole("button", {name:"Registrar ajuste"}).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(tarjeta).toContainText("Pocas unidades")
    await page.getByLabel("Estado").selectOption("pocas")
    await expect(tarjeta).toBeVisible()
    await page.getByLabel("Estado").selectOption("disponible")
    await expect(tarjeta).toHaveCount(0)
    await page.getByLabel("Estado").selectOption("")

    // Historial con el movimiento registrado.
    await page.getByRole("button", {name:`Más acciones de ${NOMBRE}`}).click()
    await page.getByRole("menuitem", {name:"Historial"}).click()
    const historial = page.getByRole("dialog")
    await expect(historial.getByText("Existencias previas")).toBeVisible()
    await expect(historial.getByText(/Stock resultante: 4/)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })
}
