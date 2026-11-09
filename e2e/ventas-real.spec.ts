import { expect, test } from "@playwright/test"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { eq, inArray } from "drizzle-orm"
import { crearConexionBd } from "../lib/infraestructura/conexion-bd"
import { ajusteStock, inventario, movimientoStock } from "../lib/infraestructura/esquemas/inventario"
import { categoria, producto } from "../lib/infraestructura/esquemas/producto"
import { venta, ventaLinea } from "../lib/infraestructura/esquemas/venta"
import { CATEGORIAS_INICIALES, type CodigoCategoria } from "../lib/modulos/productos/categorias"
import { validarUrlBdPruebas } from "../pruebas/guardia-url-bd"
import { borrarCuentaDePrueba, CONTRASENA_DE_PRUEBA, crearCuentaDePrueba, EMAIL_DE_PRUEBA, reiniciarLimiteDeIntentos } from "./apoyo/cuenta-de-prueba"

// Ventas administrativas (change implement-sales, 6.1) con servidor Next real, Auth real y la
// base de pruebas: producto oculto con stock -> venta -> consulta -> anulacion.

// axe-core llega con eslint-plugin-jsx-a11y (mismo recurso que usa navegacion-admin.spec.ts).
const raiz = createRequire(resolve("package.json"))
const a11y = createRequire(createRequire(raiz.resolve("eslint-config-next")).resolve("eslint-plugin-jsx-a11y"))
const violacionesAxe = async (page: import("@playwright/test").Page, contexto: string) => {
  // El dialogo se anima al abrir: con la opacidad a medias axe mide mal el contraste.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
  await page.addScriptTag({ path: a11y.resolve("axe-core/axe.min.js") })
  return page.evaluate(async (incluir) => {
    const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: unknown[] }[] }[] }> } }).axe
    // Cada violacion se informa con sus elementos para poder corregirla sin adivinar.
    return (await axe.run({ include: [incluir] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }))
      .violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)
  }, contexto)
}

const con = () => crearConexionBd(validarUrlBdPruebas(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL))
const ID = "e2e00000-0000-4000-8000-000000000002"
const NOMBRE = "Anillo E2E Ventas"
let categoriasAgregadas: CodigoCategoria[] = []

async function limpiar() {
  const conexion = con()
  try {
    await conexion.db.delete(movimientoStock)
    await conexion.db.delete(ajusteStock).where(inArray(ajusteStock.productoId, [ID]))
    await conexion.db.delete(ventaLinea)
    await conexion.db.delete(venta)
    await conexion.db.delete(inventario).where(inArray(inventario.productoId, [ID]))
    await conexion.db.delete(producto).where(inArray(producto.id, [ID]))
  } finally { await conexion.pool.end() }
}

async function saldoDelProducto() {
  const conexion = con()
  try {
    const [fila] = await conexion.db.select().from(inventario).where(eq(inventario.productoId, ID))
    return fila.cantidad
  } finally { await conexion.pool.end() }
}

test.beforeAll(async () => {
  await crearCuentaDePrueba()
  await limpiar()
  const conexion = con()
  try {
    const anteriores = await conexion.db.select().from(categoria)
    categoriasAgregadas = CATEGORIAS_INICIALES.map((c) => c.codigo).filter((codigo) => !anteriores.some((c) => c.codigo === codigo))
    await conexion.db.insert(categoria).values(CATEGORIAS_INICIALES.map((c) => ({ ...c }))).onConflictDoNothing()
    // Producto oculto (no publicado) con stock: se puede vender internamente.
    await conexion.db.insert(producto).values({ id: ID, slug: "anillo-e2e-ventas", nombre: NOMBRE, precio: "10.00", categoriaCodigo: "collares", publicado: false, destacado: false })
    await conexion.db.insert(inventario).values({ productoId: ID, cantidad: 4 })
  } finally { await conexion.pool.end() }
})
// Cada vista parte de cero ventas y de cuatro unidades.
test.beforeEach(async () => {
  const conexion = con()
  try {
    await conexion.db.delete(movimientoStock)
    await conexion.db.delete(ventaLinea)
    await conexion.db.delete(venta)
    await conexion.db.update(inventario).set({ cantidad: 4 }).where(eq(inventario.productoId, ID))
  } finally { await conexion.pool.end() }
})
test.afterAll(async () => {
  await limpiar()
  if (categoriasAgregadas.length) {
    const conexion = con()
    try { await conexion.db.delete(categoria).where(inArray(categoria.codigo, categoriasAgregadas)) } finally { await conexion.pool.end() }
  }
  await borrarCuentaDePrueba()
})

for (const [vista, width, height] of [["desktop", 1280, 900], ["mobile", 390, 844]] as const) {
  test(`venta con stock real: registrar, consultar y anular en ${vista}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await reiniciarLimiteDeIntentos()
    await page.goto("/admin/ventas")
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.getByLabel("Correo electrónico").fill(EMAIL_DE_PRUEBA)
    await page.getByLabel("Contraseña", { exact: true }).fill(CONTRASENA_DE_PRUEBA)
    await page.getByRole("button", { name: "Ingresar", exact: true }).click()
    await expect(page).toHaveURL(/\/admin$/)

    await page.goto("/admin/ventas")
    await expect(page.getByText("Datos de demostración")).toHaveCount(0)
    await expect(page.getByText("Todavía no registraste ventas")).toBeVisible()

    // Stock insuficiente: informa el disponible, no guarda nada y conserva el formulario.
    expect(await violacionesAxe(page, "main")).toEqual([])
    await page.getByRole("button", { name: "Registrar venta" }).click()
    const dialogo = page.getByRole("dialog")
    expect(await violacionesAxe(page, "[role='dialog']")).toEqual([])
    await dialogo.getByLabel("Producto 1 *").selectOption(ID)
    await dialogo.getByLabel("Cantidad *").fill("9")
    await dialogo.getByRole("button", { name: "Confirmar venta" }).click()
    await expect(dialogo.getByRole("alert")).toContainText(`No alcanza el stock de ${NOMBRE}: hay 4 y la venta pide 9`)
    await expect(dialogo.getByLabel("Cantidad *")).toHaveValue("9")
    expect(await saldoDelProducto()).toBe(4)

    // Se ajusta la cantidad y se confirma: queda en el listado y descuenta el stock.
    await dialogo.getByLabel("Cantidad *").fill("3")
    await dialogo.getByLabel("Comprador (opcional)").fill("Ana Pérez")
    await dialogo.getByRole("button", { name: "Confirmar venta" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.getByRole("status").filter({ hasText: "Venta registrada por $30" })).toBeVisible()
    const fila = page.getByRole("table", { name: "Ventas" }).getByRole("row").filter({ hasText: "Ana Pérez" })
    await expect(fila).toContainText("Confirmada")
    await expect(fila).toContainText("$30")
    expect(await saldoDelProducto()).toBe(1)

    // Detalle con el precio historico.
    await fila.getByRole("button", { name: /Ver detalle de la venta/ }).click()
    const detalle = page.getByRole("dialog")
    await expect(detalle.getByRole("table", { name: "Productos de la venta" })).toContainText(NOMBRE)
    expect(await violacionesAxe(page, "[role='dialog']")).toEqual([])

    // Anulacion con confirmacion: reintegra el stock y conserva la venta como anulada.
    await detalle.getByRole("button", { name: "Anular venta" }).click()
    await expect(detalle.getByText("¿Anular esta venta?")).toBeVisible()
    await detalle.getByRole("button", { name: "Sí, anular venta" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(fila).toContainText("Anulada")
    expect(await saldoDelProducto()).toBe(4)

    // Filtro por estado (servidor): la anulada sigue visible en su historial.
    await page.getByLabel("Estado").selectOption("CONFIRMADA")
    await page.getByRole("button", { name: "Filtrar" }).click()
    await expect(page).toHaveURL(/estado=CONFIRMADA/)
    await expect(page.getByText("No hay ventas con estos filtros")).toBeVisible()
    await page.getByLabel("Estado").selectOption("ANULADA")
    await page.getByRole("button", { name: "Filtrar" }).click()
    await expect(page.getByRole("table", { name: "Ventas" })).toContainText("Ana Pérez")
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })
}
