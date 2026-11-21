import { user } from "@/lib/infraestructura/esquemas/auth"
import { compra, compraLinea } from "@/lib/infraestructura/esquemas/compra"
import { venta, ventaLinea } from "@/lib/infraestructura/esquemas/venta"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { producto } from "@/lib/infraestructura/esquemas/producto"
import { crearConsultasCatalogo } from "@/lib/modulos/catalogo/consultas"
import { inventario } from "@/lib/infraestructura/esquemas/inventario"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "./persistencia"
import { crearPublicacionProductos } from "./publicacion"

describe("Producto 2.4: flags reales sin dependencia del proveedor", () => {
  let conexion: ConexionBd
  let id: string
  const exigir = crearExigirAdministradora(async () => ({ id: "admin", nombre: "Admin", email: "admin@example.test" }))
  const ejecutar = (accion: string, version = 1, productoId = id) => crearPublicacionProductos({ db: conexion.db, exigir })(new Headers(), { id: productoId, version, accion })
  const leer = async () => (await conexion.db.select().from(producto).where(eq(producto.id, id)))[0]
  const imagen = { imagenAssetId: "asset-test", imagenPublicId: "prueba/publicacion", imagenVersionProveedor: "1", imagenUrlSegura: "https://example.test/imagen.jpg", imagenAncho: 640, imagenAlto: 480, imagenFormato: "jpeg" }
  async function limpiar() {
    if (!id) return
    await conexion.db.delete(compraLinea).where(eq(compraLinea.productoId, id))
    await conexion.db.delete(ventaLinea).where(eq(ventaLinea.productoId, id))
    await conexion.db.delete(compra).where(eq(compra.claveSolicitud, id))
    await conexion.db.delete(venta).where(eq(venta.claveSolicitud, id))
    await conexion.db.delete(user).where(eq(user.id, id))
    await conexion.db.delete(inventario).where(eq(inventario.productoId, id))
    await conexion.db.delete(producto).where(eq(producto.id, id))
  }
  beforeAll(() => { conexion = crearConexionPruebas() })
  beforeEach(async () => {
    await limpiar()
    id = crypto.randomUUID()
    await conexion.db.transaction(async (tx) => {
      await sembrarCategorias(tx)
      await insertarProductoOcultoConSaldo(tx, id, { nombre: "Producto flags", precio: "10.50", categoriaCodigo: "collares" }, crearContratoInventario(conexion.db).crearSaldoCero)
    })
  })
  afterAll(async () => { if (conexion) { await limpiar(); await conexion.pool.end() } })

  it("sin sesion no consulta ni escribe, ni siquiera valida el comando", async () => {
    const select = vi.spyOn(conexion.db, "select")
    const transaction = vi.spyOn(conexion.db, "transaction")
    const sinSesion = crearPublicacionProductos({ db: conexion.db, exigir: crearExigirAdministradora(async () => null) })
    try {
      expect(await sinSesion(new Headers(), null)).toEqual({ estado: "sesion_requerida" })
      expect(select).not.toHaveBeenCalled()
      expect(transaction).not.toHaveBeenCalled()
    } finally { select.mockRestore(); transaction.mockRestore() }
  })
  it("exige imagen persistida, conserva oculto sin ella y permite destacar/ocultar", async () => {
    expect(await ejecutar("publicar")).toEqual({ estado: "imagen_requerida" })
    expect(await ejecutar("destacar")).toMatchObject({ estado: "ok", version: 2 })
    expect(await ejecutar("ocultar", 2)).toMatchObject({ estado: "ok", version: 3 })
    expect(await leer()).toMatchObject({ publicado: false, destacado: true, imagenAssetId: null })
  })
  it("publica/oculta/destaca/quita destacado sin tocar slug, precio, imagen, datos o inventario", async () => {
    await conexion.db.update(producto).set(imagen).where(eq(producto.id, id))
    const antes = await leer()
    const saldo = await conexion.db.select().from(inventario).where(eq(inventario.productoId, id))
    for (const [indice, accion] of ["publicar", "destacar", "ocultar", "quitar_destacado"].entries()) {
      expect(await ejecutar(accion, indice + 1)).toMatchObject({ estado: "ok", version: indice + 2 })
      expect(await leer()).toMatchObject({ publicado: indice < 2, destacado: indice === 1 || indice === 2 })
    }
    const despues = await leer()
    expect(despues).toEqual({ ...antes, publicado: false, destacado: false, version: 5, actualizadoEn: despues.actualizadoEn })
    expect(await conexion.db.select().from(inventario).where(eq(inventario.productoId, id))).toEqual(saldo)
  })
  it("rechaza una referencia HTTPS malformada sin publicar", async () => {
    await conexion.db.update(producto).set({ ...imagen, imagenUrlSegura: "https://[" }).where(eq(producto.id, id))
    expect(await ejecutar("publicar")).toEqual({ estado: "imagen_requerida" })
    expect((await leer()).publicado).toBe(false)
  })
  it("valida accion/id/version y no admite campos comerciales extra", async () => {
    expect(await ejecutar("borrar")).toEqual({ estado: "datos_invalidos" })
    expect(await ejecutar("ocultar", 0)).toEqual({ estado: "datos_invalidos" })
    expect(await ejecutar("ocultar", 1, "invalido")).toEqual({ estado: "datos_invalidos" })
    expect(await crearPublicacionProductos({ db: conexion.db, exigir })(new Headers(), { id, version: 1, accion: "publicar", precio: "1" })).toEqual({ estado: "datos_invalidos" })
    expect((await leer()).version).toBe(1)
  })
  it("archiva una sola vez y retira del catálogo sin alterar imagen, saldo ni operaciones históricas", async () => {
    await conexion.db.update(producto).set({ ...imagen, publicado: true, destacado: true }).where(eq(producto.id, id))
    await conexion.db.update(inventario).set({ cantidad: 3 }).where(eq(inventario.productoId, id))
    const antes = await leer()
    const saldo = await conexion.db.select().from(inventario).where(eq(inventario.productoId, id))
    await conexion.db.insert(user).values({ id, name: "Prueba", email: `${id}@example.test` })
    const operacion = { actorId: id, fechaOperacion: "2026-11-01", claveSolicitud: id, huella: id }
    const [compraAnterior] = await conexion.db.insert(compra).values({ ...operacion, total: "4.00" }).returning()
    const [ventaAnterior] = await conexion.db.insert(venta).values({ ...operacion, total: "10.50" }).returning()
    const linea = { productoId: id, nombreProductoHistorico: antes.nombre, cantidad: 1, numeroLinea: 1 }
    const [lineaCompra] = await conexion.db.insert(compraLinea).values({ ...linea, compraId: compraAnterior.id, costoUnitarioHistorico: "4.00", subtotal: "4.00" }).returning()
    const [lineaVenta] = await conexion.db.insert(ventaLinea).values({ ...linea, ventaId: ventaAnterior.id, precioUnitarioHistorico: "10.50", subtotal: "10.50" }).returning()
    const catalogo = crearConsultasCatalogo(conexion.db)
    expect(await catalogo.consultarPorSlug(antes.slug)).not.toBeNull()
    expect((await catalogo.listar()).some(p => p.slug === antes.slug)).toBe(true)
    const sinSesion = crearPublicacionProductos({ db: conexion.db, exigir: crearExigirAdministradora(async () => null) })
    expect(await sinSesion(new Headers(), { id, accion: "archivar", version: 1 })).toEqual({ estado: "sesion_requerida" })
    expect(await ejecutar("archivar", 2)).toEqual({ estado: "conflicto_version" })
    const resultados = await Promise.all([ejecutar("archivar"), ejecutar("archivar")])
    for (const resultado of resultados) expect(resultado).toMatchObject({ estado: "ok", version: 2 })
    const despues = await leer()
    expect(despues).toEqual({ ...antes, publicado: false, destacado: false, archivado: true, version: 2, actualizadoEn: despues.actualizadoEn })
    expect(await conexion.db.select().from(inventario).where(eq(inventario.productoId, id))).toEqual(saldo)
    expect(await conexion.db.select().from(compra).where(eq(compra.id, compraAnterior.id))).toEqual([compraAnterior])
    expect(await conexion.db.select().from(venta).where(eq(venta.id, ventaAnterior.id))).toEqual([ventaAnterior])
    expect(await conexion.db.select().from(compraLinea).where(eq(compraLinea.productoId, id))).toEqual([lineaCompra])
    expect(await conexion.db.select().from(ventaLinea).where(eq(ventaLinea.productoId, id))).toEqual([lineaVenta])
    expect(await catalogo.consultarPorSlug(antes.slug)).toBeNull()
    expect((await catalogo.listar()).some(p => p.slug === antes.slug)).toBe(false)
    expect((await catalogo.listarIndexables()).some(p => p.slug === antes.slug)).toBe(false)
    expect(await ejecutar("publicar", 2)).toEqual({ estado: "no_encontrado" })
  })
  it("distingue inexistente y version atrasada sin efectos", async () => {
    expect(await ejecutar("ocultar", 1, crypto.randomUUID())).toEqual({ estado: "no_encontrado" })
    expect(await ejecutar("ocultar", 2)).toEqual({ estado: "conflicto_version" })
  })
  it("dos cambios concurrentes con version identica no se pisan", async () => {
    const resultados = await Promise.all([ejecutar("destacar"), ejecutar("quitar_destacado")])
    expect(resultados.map((r) => r.estado).sort()).toEqual(["conflicto_version", "ok"])
    expect((await leer()).version).toBe(2)
  })
})
