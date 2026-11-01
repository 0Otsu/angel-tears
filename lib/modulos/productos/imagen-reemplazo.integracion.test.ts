import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { producto, categoria } from "@/lib/infraestructura/esquemas/producto"
import { inventario } from "@/lib/infraestructura/esquemas/inventario"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { crearConsultasCatalogo } from "@/lib/modulos/catalogo/consultas"
import { metadataProducto } from "@/lib/modulos/catalogo/metadata-publica"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { almacenImagenPrueba, crearImagenPrueba, referenciaImagenPrueba } from "@/pruebas/imagenes-producto"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "./persistencia"
import { crearCargaImagenProducto, crearReemplazoImagenProducto } from "./imagen-servicio"
import { MAXIMO_BYTES_IMAGEN } from "./imagen-contrato"

const exigir = crearExigirAdministradora(async () => ({ id: "admin", nombre: "Admin", email: "admin@example.test" }))
const headers = new Headers()
const imagenNueva = (publicId: string) => ({ ...referenciaImagenPrueba(publicId), urlSegura: `https://res.cloudinary.com/pruebas/image/upload/v1/${encodeURIComponent(publicId)}.png` })

describe("reemplazo de imagen: SQL real, proveedor controlado", () => {
  let con: ConexionBd
  let id: string
  let png: Buffer
  let anterior: typeof producto.$inferSelect
  const almacen = almacenImagenPrueba()
  const subir = vi.spyOn(almacen, "almacenarImagen")
  const eliminar = vi.spyOn(almacen, "eliminarImagen")
  const leer = async () => (await con.db.select().from(producto).where(eq(producto.id, id)))[0]
  const saldo = async () => (await con.db.select().from(inventario).where(eq(inventario.productoId, id)))[0]
  const servicio = () => crearReemplazoImagenProducto({ db: con.db, exigir, almacen })
  const reemplazar = () => servicio()(headers, { id, version: 2 }, png)
  async function limpiar() {
    await con.db.execute(sql`DROP TRIGGER IF EXISTS prueba_fallar_reemplazo ON producto`)
    await con.db.execute(sql`DROP FUNCTION IF EXISTS prueba_fallar_reemplazo()`)
    await con.db.delete(inventario); await con.db.delete(producto); await con.db.delete(categoria)
  }
  beforeAll(async () => { con = crearConexionPruebas(); png = await crearImagenPrueba() })
  beforeEach(async () => {
    await limpiar()
    subir.mockReset().mockImplementation(async ({ publicId }) => imagenNueva(publicId))
    eliminar.mockReset().mockResolvedValue()
    id = crypto.randomUUID()
    await con.db.transaction(async tx => {
      await sembrarCategorias(tx)
      await insertarProductoOcultoConSaldo(tx, id, { nombre: "Collar reemplazo", precio: "1234.56", categoriaCodigo: "collares" }, crearContratoInventario(con.db).crearSaldoCero)
    })
    await crearCargaImagenProducto({ db: con.db, exigir, almacen })(headers, { id, version: 1 }, png)
    await con.db.update(producto).set({ publicado: true, destacado: true }).where(eq(producto.id, id))
    anterior = await leer()
    subir.mockClear(); eliminar.mockClear()
  })
  afterAll(async () => { if (con) { await limpiar(); await con.pool.end() } })

  it("A a B: preserva datos/flags/C0, limpia A solo tras commit y entrega B en proyeccion/OG", async () => {
    await con.db.update(inventario).set({ cantidad: 3 }).where(eq(inventario.productoId, id))
    const stock = await saldo()
    eliminar.mockImplementation(async recurso => {
      expect(recurso).toBe(anterior.imagenPublicId)
      // Otra conexion SQL fuera de la tx ve B antes del destroy: commit real confirmado.
      expect((await leer()).imagenPublicId).toBe(subir.mock.calls[0][0].publicId)
    })
    const resultado = await reemplazar()
    expect(resultado).toMatchObject({ estado: "ok", version: 3 })
    const despues = await leer()
    expect(despues).toEqual({ ...anterior, imagenAssetId: resultado.imagen.assetId, imagenPublicId: resultado.imagen.publicId,
      imagenVersionProveedor: resultado.imagen.versionProveedor, imagenUrlSegura: resultado.imagen.urlSegura,
      imagenAncho: resultado.imagen.ancho, imagenAlto: resultado.imagen.alto, imagenFormato: resultado.imagen.formato,
      version: 3, actualizadoEn: despues.actualizadoEn })
    expect(await saldo()).toEqual(stock)
    expect(eliminar).toHaveBeenCalledExactlyOnceWith(anterior.imagenPublicId)
    const catalogo = crearConsultasCatalogo(con.db)
    const publico = await catalogo.consultarPorSlug(anterior.slug)
    expect(publico?.imagen?.url).toBe(resultado.imagen.urlSegura)
    expect(metadataProducto(publico!).openGraph?.images).toEqual([expect.objectContaining({ url: resultado.imagen.urlSegura })])
    expect((await catalogo.listar())[0].imagen?.url).toBe(resultado.imagen.urlSegura)
    expect((await catalogo.listar({ destacados: true }))[0].imagen?.url).toBe(resultado.imagen.urlSegura)
  })
  it("sin autorizacion no consulta ni sube ni limpia", async () => {
    const seleccionar = vi.spyOn(con.db, "select")
    const sinSesion = crearReemplazoImagenProducto({ db: con.db, exigir: crearExigirAdministradora(async () => null), almacen })
    try {
      await expect(sinSesion(headers, null, png)).rejects.toMatchObject({ codigo: "SESION_REQUERIDA" })
      expect(seleccionar).not.toHaveBeenCalled()
      expect(subir).not.toHaveBeenCalled(); expect(eliminar).not.toHaveBeenCalled()
    } finally { seleccionar.mockRestore() }
    expect(await leer()).toEqual(anterior)
  })
  it("inexistente, referencia invalida, version stale y sin imagen se distinguen antes del proveedor", async () => {
    await expect(servicio()(headers, { id: crypto.randomUUID(), version: 2 }, png)).rejects.toMatchObject({ codigo: "producto_inexistente" })
    await expect(servicio()(headers, { id, version: 0 }, png)).rejects.toMatchObject({ codigo: "solicitud_invalida" })
    await expect(servicio()(headers, { id, version: 1 }, png)).rejects.toMatchObject({ codigo: "version_desactualizada" })
    expect(await leer()).toEqual(anterior)
    const nuevo = crypto.randomUUID()
    await con.db.transaction(tx => insertarProductoOcultoConSaldo(tx, nuevo, { nombre: "Sin imagen", precio: "1.00", categoriaCodigo: "collares" }, crearContratoInventario(con.db).crearSaldoCero))
    await expect(servicio()(headers, { id: nuevo, version: 1 }, png)).rejects.toMatchObject({ codigo: "imagen_requerida" })
    expect(subir).not.toHaveBeenCalled(); expect(eliminar).not.toHaveBeenCalled()
  })
  it.each([
    ["contenido falso", () => Buffer.from("falso jpg"), "tipo_invalido"],
    ["exceso de bytes", () => Buffer.alloc(MAXIMO_BYTES_IMAGEN + 1), "exceso_bytes"],
    ["exceso de pixeles", () => crearImagenPrueba("png", 5000, 5000), "exceso_pixeles"],
  ] as const)("%s conserva A sin subir", async (_nombre, contenido, codigo) => {
    await expect(servicio()(headers, { id, version: 2 }, await contenido())).rejects.toMatchObject({ codigo })
    expect(await leer()).toEqual(anterior)
    expect(subir).not.toHaveBeenCalled(); expect(eliminar).not.toHaveBeenCalled()
  })
  it("upload fallido conserva A/version y compensa exclusivamente el ID nuevo", async () => {
    subir.mockRejectedValueOnce(new Error("fallo de upload"))
    await expect(reemplazar()).rejects.toMatchObject({ codigo: "error_proveedor" })
    expect(await leer()).toEqual(anterior)
    expect(eliminar).toHaveBeenCalledExactlyOnceWith(subir.mock.calls[0][0].publicId)
    expect(eliminar).not.toHaveBeenCalledWith(anterior.imagenPublicId)
  })
  it("fallo SQL real tras subir B revierte la referencia y limpia solo B", async () => {
    await con.db.execute(sql`CREATE FUNCTION prueba_fallar_reemplazo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo SQL deliberado'; END $$`)
    await con.db.execute(sql`CREATE TRIGGER prueba_fallar_reemplazo BEFORE UPDATE ON producto FOR EACH ROW EXECUTE FUNCTION prueba_fallar_reemplazo()`)
    await expect(reemplazar()).rejects.toMatchObject({ codigo: "error_persistencia" })
    expect(await leer()).toEqual(anterior)
    expect(eliminar).toHaveBeenCalledExactlyOnceWith(subir.mock.calls[0][0].publicId)
  })
  it("destroy A fallido tras commit conserva B y devuelve exito con aviso, sin revelar secretos", async () => {
    eliminar.mockRejectedValueOnce(new Error("api_secret sensible"))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const resultado = await reemplazar()
      expect(resultado).toMatchObject({ estado: "ok", version: 3, limpiezaPendiente: true })
      expect((await leer()).imagenPublicId).toBe(resultado.imagen.publicId)
      expect(eliminar).toHaveBeenCalledExactlyOnceWith(anterior.imagenPublicId)
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/api_secret|sensible/)
      expect(log).toHaveBeenCalledWith("[productos.imagen] limpieza pendiente", { recurso: anterior.imagenPublicId })
    } finally { log.mockRestore() }
  })
  it("dos reemplazos de la misma version: uno confirma, perdedor limpia B propio, ganador intacto", async () => {
    let liberar!: () => void
    const barrera = new Promise<void>(resolver => { liberar = resolver })
    let cantidad = 0
    subir.mockImplementation(async ({ publicId }) => {
      if (++cantidad === 2) liberar()
      await barrera
      return imagenNueva(publicId)
    })
    const resultados = await Promise.allSettled([reemplazar(), reemplazar()])
    expect(resultados.filter(r => r.status === "fulfilled")).toHaveLength(1)
    expect(resultados.find(r => r.status === "rejected")).toMatchObject({ reason: { codigo: "conflicto_version" } })
    const ganador = await leer()
    expect(ganador.version).toBe(3)
    const idsB = subir.mock.calls.map(c => c[0].publicId)
    const borrados = eliminar.mock.calls.map(c => c[0])
    expect(borrados.sort()).toEqual([anterior.imagenPublicId!, idsB.find(valor => valor !== ganador.imagenPublicId)!].sort())
    expect(borrados).not.toContain(ganador.imagenPublicId)
  })
  it("COMMIT sin acuse recupera B y solo despues limpia A", async () => {
    const original = con.db.transaction.bind(con.db)
    const transaccion = vi.spyOn(con.db, "transaction").mockImplementationOnce(async callback => {
      await original(callback); throw new Error("acuse perdido")
    })
    try {
      const resultado = await reemplazar()
      expect(resultado).toMatchObject({ estado: "ok", version: 3 })
      expect((await leer()).imagenPublicId).toBe(resultado.imagen.publicId)
      expect(eliminar).toHaveBeenCalledExactlyOnceWith(anterior.imagenPublicId)
    } finally { transaccion.mockRestore() }
  })
  it("confirmacion desconocida por fallo de relectura no destruye A ni B a ciegas", async () => {
    const original = con.db.transaction.bind(con.db)
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const seleccionar = vi.spyOn(con.db, "select")
    const transaccion = vi.spyOn(con.db, "transaction").mockImplementationOnce(async callback => {
      await original(callback)
      seleccionar.mockImplementationOnce(() => { throw new Error("DB caida") })
      throw new Error("acuse perdido")
    })
    try {
      await expect(reemplazar()).rejects.toMatchObject({ codigo: "error_tecnico" })
      expect(eliminar).not.toHaveBeenCalled()
      expect((await leer()).imagenPublicId).toBe(subir.mock.calls[0][0].publicId)
    } finally { transaccion.mockRestore(); seleccionar.mockRestore(); log.mockRestore() }
  })
  it("referencia anterior compartida por otra fila nunca se destruye", async () => {
    const otro = crypto.randomUUID()
    await con.db.transaction(tx => insertarProductoOcultoConSaldo(tx, otro, { nombre: "Otro", precio: "1.00", categoriaCodigo: "collares" }, crearContratoInventario(con.db).crearSaldoCero))
    await con.db.update(producto).set({ imagenAssetId: anterior.imagenAssetId, imagenPublicId: anterior.imagenPublicId,
      imagenVersionProveedor: anterior.imagenVersionProveedor, imagenUrlSegura: anterior.imagenUrlSegura,
      imagenAncho: anterior.imagenAncho, imagenAlto: anterior.imagenAlto, imagenFormato: anterior.imagenFormato }).where(eq(producto.id, otro))
    expect(await reemplazar()).toMatchObject({ estado: "ok" })
    expect(eliminar).not.toHaveBeenCalled()
  })
})
