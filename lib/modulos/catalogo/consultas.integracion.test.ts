import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq, inArray } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { inventario } from "@/lib/infraestructura/esquemas/inventario"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { sembrarCategorias } from "@/lib/modulos/productos/persistencia"
import { crearConsultasCatalogo } from "./consultas"

describe("proyeccion publica PostgreSQL Producto + Inventario", () => {
  let con: ConexionBd
  let ids: string[] = []
  const servicio = () => crearConsultasCatalogo(con.db)
  async function crear(nombre: string, publicado: boolean, cantidad: number, destacado = false, categoriaCodigo: "collares" | "anillos" = "collares") {
    const id = crypto.randomUUID()
    ids.push(id)
    await con.db.insert(producto).values({ id, slug: `prueba-${id}`, nombre, precio: "90071992547409.93", categoriaCodigo, publicado, destacado,
      imagenAssetId: "privado-asset", imagenPublicId: "privado-id", imagenVersionProveedor: "123", imagenUrlSegura: "https://example.test/imagen.jpg", imagenAncho: 640, imagenAlto: 480, imagenFormato: "jpeg" })
    await con.db.insert(inventario).values({ productoId: id, cantidad, minimo: 7 })
    return { id, slug: `prueba-${id}` }
  }
  async function limpiar() {
    if (ids.length) {
      await con.db.delete(inventario).where(inArray(inventario.productoId, ids))
      await con.db.delete(producto).where(inArray(producto.id, ids))
    }
    ids = []
  }
  beforeAll(() => { con = crearConexionPruebas() })
  beforeEach(async () => { await limpiar(); await con.db.transaction(sembrarCategorias) })
  afterAll(async () => { if (con) { await limpiar(); await con.pool.end() } })

  it("listado solo publicado con stock, agotado conserva PDP y oculto/inexistente devuelve null", async () => {
    const visible = await crear("Visible", true, 2)
    const agotado = await crear("Agotado", true, 0)
    const oculto = await crear("Oculto", false, 8)
    expect((await servicio().listar()).filter((p) => ids.includes(p.id)).map((p) => p.id)).toEqual([visible.id])
    expect(await servicio().consultarPorSlug(agotado.slug)).toMatchObject({ disponible: false, nombre: "Agotado" })
    expect(await servicio().consultarPorSlug(oculto.slug)).toBeNull()
    expect(await servicio().consultarPorSlug("no-existe")).toBeNull()
    expect((await con.db.select().from(producto).where(eq(producto.id, oculto.id)))).toHaveLength(1)
  })
  it("DTO allowlist sin saldo exacto, minimo, version, flags privados ni ids del proveedor", async () => {
    const visible = await crear("Visible", true, 12)
    const dto = await servicio().consultarPorSlug(visible.slug)
    expect(Object.keys(dto!).sort()).toEqual(["galeria", "id", "slug", "nombre", "precio", "moneda", "categoriaCodigo", "categoriaNombre", "descripcion", "material", "medida", "color", "cuidados", "destacado", "disponible", "imagen"].sort())
    expect(dto).toMatchObject({ precio: "90071992547409.93", moneda: "ARS", disponible: true, imagen: { url: "https://example.test/imagen.jpg", ancho: 640, alto: 480 } })
    expect(JSON.stringify(dto)).not.toMatch(/privado|cantidad|minimo|version|actualizadoEn|creadoEn/)
  })
  it("filtra categoria/destacado, excluye actual y aplica limite sin N+1", async () => {
    const actual = await crear("Actual", true, 1, true)
    const otro = await crear("Otro", true, 1, true)
    await crear("No destacado", true, 1)
    await crear("Otra categoria", true, 1, true, "anillos")
    await crear("Agotado destacado", true, 0, true)
    const select = vi.spyOn(con.db, "select")
    try {
      const resultado = await servicio().listar({ categoriaCodigo: "collares", destacados: true, excluirId: actual.id, limite: 3 })
      expect(resultado.map((p) => p.id)).toEqual([otro.id])
      expect(select).toHaveBeenCalledTimes(1)
    } finally { select.mockRestore() }
  })
  it("cambios persistidos de ocultacion/agotado/reposicion aparecen en la siguiente consulta", async () => {
    const actual = await crear("Actual", true, 1)
    expect(await servicio().consultarPorSlug(actual.slug)).toMatchObject({ disponible: true })
    await con.db.update(inventario).set({ cantidad: 0 }).where(eq(inventario.productoId, actual.id))
    expect((await servicio().listar()).some((p) => p.id === actual.id)).toBe(false)
    expect(await servicio().consultarPorSlug(actual.slug)).toMatchObject({ disponible: false })
    await con.db.update(inventario).set({ cantidad: 1 }).where(eq(inventario.productoId, actual.id))
    expect((await servicio().listar()).some((p) => p.id === actual.id)).toBe(true)
    await con.db.update(producto).set({ publicado: false }).where(eq(producto.id, actual.id))
    expect(await servicio().consultarPorSlug(actual.slug)).toBeNull()
  })
  it("fallo de lectura no se transforma en vacio ni inexistente", async () => {
    const select = vi.spyOn(con.db, "select").mockImplementation(() => { throw new Error("DB no disponible") })
    try {
      await expect(servicio().listar()).rejects.toThrow("DB no disponible")
      await expect(servicio().consultarPorSlug("cualquier-slug")).rejects.toThrow("DB no disponible")
    } finally { select.mockRestore() }
  })

  it("indexables incluye PDP agotada, excluye oculto y usa modificacion real de producto/stock", async () => {
    const agotado = await crear("Agotado", true, 0)
    const oculto = await crear("Oculto", false, 3)
    const fecha = new Date("2026-10-31T12:00:00Z")
    await con.db.update(producto).set({ actualizadoEn: new Date("2026-10-30T12:00:00Z") }).where(eq(producto.id, agotado.id))
    await con.db.update(inventario).set({ actualizadoEn: fecha }).where(eq(inventario.productoId, agotado.id))
    const filas = await servicio().listarIndexables()
    expect(filas.find((p) => p.slug === agotado.slug)?.modificadoEn).toEqual(fecha)
    expect(filas.some((p) => p.slug === oculto.slug)).toBe(false)
  })
})
