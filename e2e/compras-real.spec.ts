import { expect, test } from "@playwright/test"
import { eq, inArray, sql } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { compra, compraLinea } from "../lib/infraestructura/esquemas/compra"
import { ajusteStock, inventario, movimientoStock } from "../lib/infraestructura/esquemas/inventario"
import { categoria, producto } from "../lib/infraestructura/esquemas/producto"
import { proveedor } from "../lib/infraestructura/esquemas/proveedor"
import { CATEGORIAS_INICIALES, type CodigoCategoria } from "../lib/modulos/productos/categorias"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { borrarCuentaDePrueba, CONTRASENA_DE_PRUEBA, crearCuentaDePrueba, EMAIL_DE_PRUEBA, reiniciarLimiteDeIntentos } from "./apoyo/cuenta-de-prueba"

// Compras administrativas (tareas 4.5 y 5.1) con servidor Next real, Auth real y la base de
// pruebas: Producto -> proveedor -> compra con stock -> consulta -> anulacion bloqueada y exitosa.

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
const ID = "e2ec0000-0000-4000-8000-000000000001"
const NOMBRE = "Anillo E2E Compras"
const PROVEEDOR = "E2E Compras Proveedor"
let categoriasAgregadas: CodigoCategoria[] = []

async function limpiarCompras() {
  const conexion = con()
  try {
    const lineas = await conexion.db.select({ id: compraLinea.id, compraId: compraLinea.compraId }).from(compraLinea).where(eq(compraLinea.productoId, ID))
    if (lineas.length) await conexion.db.delete(movimientoStock).where(inArray(movimientoStock.compraLineaId, lineas.map((l) => l.id)))
    await conexion.db.delete(movimientoStock).where(eq(movimientoStock.productoId, ID))
    if (lineas.length) {
      await conexion.db.delete(compraLinea).where(inArray(compraLinea.compraId, lineas.map((l) => l.compraId)))
      await conexion.db.delete(compra).where(inArray(compra.id, lineas.map((l) => l.compraId)))
    }
    await conexion.db.delete(ajusteStock).where(eq(ajusteStock.productoId, ID))
    await conexion.db.update(inventario).set({ cantidad: 0, minimo: null }).where(eq(inventario.productoId, ID))
  } finally { await conexion.pool.end() }
}
async function limpiarTodo() {
  await limpiarCompras()
  const conexion = con()
  try {
    await conexion.db.delete(inventario).where(eq(inventario.productoId, ID))
    await conexion.db.delete(producto).where(eq(producto.id, ID))
    await conexion.db.execute(sql`DELETE FROM proveedor WHERE nombre = ${PROVEEDOR}`)
  } finally { await conexion.pool.end() }
}

test.beforeAll(async () => {
  await crearCuentaDePrueba()
  await limpiarTodo()
  const conexion = con()
  try {
    const anteriores = await conexion.db.select().from(categoria)
    categoriasAgregadas = CATEGORIAS_INICIALES.map((c) => c.codigo).filter((codigo) => !anteriores.some((c) => c.codigo === codigo))
    await conexion.db.insert(categoria).values(CATEGORIAS_INICIALES.map((c) => ({ ...c }))).onConflictDoNothing()
    await conexion.db.insert(producto).values({ id: ID, slug: "anillo-e2e-compras", nombre: NOMBRE, precio: "10.00", categoriaCodigo: "collares", publicado: false, destacado: false })
    await conexion.db.insert(inventario).values({ productoId: ID })
    await conexion.db.insert(proveedor).values({ nombre: PROVEEDOR })
  } finally { await conexion.pool.end() }
})
test.beforeEach(limpiarCompras)
test.afterAll(async () => {
  await limpiarTodo()
  if (categoriasAgregadas.length) {
    const conexion = con()
    try { await conexion.db.delete(categoria).where(inArray(categoria.codigo, categoriasAgregadas)) } finally { await conexion.pool.end() }
  }
  await borrarCuentaDePrueba()
})

for (const [vista, width, height] of [["desktop", 1280, 900], ["mobile", 390, 844]] as const) {
  test(`registro, stock y anulacion reales en ${vista}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await reiniciarLimiteDeIntentos()
    await page.goto("/admin/compras")
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
    await page.getByRole("button", { name: "Ingresar", exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)

    await page.goto("/admin/compras")
    await expect(page.getByText("Datos de demostración")).toHaveCount(0)
    await expect(page.getByText("Todavía no registraste compras")).toBeVisible()

    // Validacion: costo con mas de dos decimales, sin redondeo ni registro parcial.
    await page.getByRole("button", { name: "Registrar compra" }).click()
    const dialogo = page.getByRole("dialog")
    await dialogo.getByLabel("Producto 1 *").selectOption({ label: `${NOMBRE} · 0 en stock` })
    await dialogo.getByLabel("Cantidad *").fill("5")
    await dialogo.getByLabel("Costo unitario *").fill("10,505")
    await dialogo.getByRole("button", { name: "Confirmar compra" }).click()
    await expect(dialogo.getByText("Ingresá un costo válido, con hasta dos decimales.")).toBeVisible()
    await expect(dialogo.getByLabel("Costo unitario *")).toBeFocused()

    // Compra valida con proveedor, nota y coma decimal.
    await dialogo.getByLabel("Costo unitario *").fill("100,50")
    await dialogo.getByLabel("Proveedor (opcional)").selectOption({ label: PROVEEDOR })
    await dialogo.getByLabel("Nota (opcional)").fill("Pedido E2E")
    await expect(dialogo.getByLabel("Subtotal del producto 1")).toContainText("502,50")
    await dialogo.getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const fila = page.getByRole("row").filter({ hasText: PROVEEDOR })
    await expect(fila).toContainText("Confirmada")
    await expect(fila).toContainText("502,50")

    // El stock aumento en Inventario.
    await page.goto("/admin/stock")
    await expect(page.getByRole("row").filter({ hasText: NOMBRE })).toContainText(/5\s*unidades/)

    // Se consumen 3 unidades: anular la compra dejaria el stock en negativo y se rechaza todo.
    const conexion = con()
    try { await conexion.db.update(inventario).set({ cantidad: 2 }).where(eq(inventario.productoId, ID)) } finally { await conexion.pool.end() }
    await page.goto("/admin/compras")
    await page.getByRole("button", { name: /Ver detalle de la compra/ }).click()
    const detalle = page.getByRole("dialog")
    await expect(detalle.getByText("Pedido E2E")).toBeVisible()
    await expect(detalle.getByText(PROVEEDOR)).toBeVisible()
    await detalle.getByRole("button", { name: "Anular compra" }).click()
    await detalle.getByRole("button", { name: "Sí, anular compra" }).click()
    await expect(detalle.getByRole("alert")).toContainText("No se hizo ningún cambio")
    await expect(detalle.getByRole("alert")).toContainText(`${NOMBRE}: hay 2 y habría que restar 5.`)
    await page.keyboard.press("Escape")
    await expect(fila).toContainText("Confirmada")

    // Con el stock disponible otra vez, la anulacion se aplica una sola vez.
    const reposicion = con()
    try { await reposicion.db.update(inventario).set({ cantidad: 5 }).where(eq(inventario.productoId, ID)) } finally { await reposicion.pool.end() }
    await page.goto("/admin/compras")
    await page.getByRole("button", { name: /Ver detalle de la compra/ }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Anular compra" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Sí, anular compra" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(fila).toContainText("Anulada")
    await page.goto("/admin/stock")
    await expect(page.getByRole("row").filter({ hasText: NOMBRE })).toContainText(/0\s*unidades/)
  })
}
