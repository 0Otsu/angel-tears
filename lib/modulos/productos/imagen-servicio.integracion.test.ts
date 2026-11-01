import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq, sql } from "drizzle-orm"
import type { ConexionBd } from "@/lib/infraestructura/conexion-bd"
import { producto, categoria } from "@/lib/infraestructura/esquemas/producto"
import { inventario } from "@/lib/infraestructura/esquemas/inventario"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearContratoInventario } from "@/lib/modulos/inventario/persistencia"
import { crearConexionPruebas } from "@/pruebas/arnes-bd"
import { almacenImagenPrueba, crearImagenPrueba, referenciaImagenPrueba } from "@/pruebas/imagenes-producto"
import { crearCargaImagenProducto } from "./imagen-servicio"
import { crearManejadorImagenProducto } from "./imagen-http"
import { insertarProductoOcultoConSaldo, sembrarCategorias } from "./persistencia"
import { crearAlmacenCloudinary } from "./imagen-cloudinary"
import { crearPublicacionProductos } from "./publicacion"
import { crearConsultasCatalogo } from "@/lib/modulos/catalogo/consultas"
import { metadataProducto } from "@/lib/modulos/catalogo/metadata-publica"

const exigir = crearExigirAdministradora(async () => ({ id: "admin", nombre: "Admin", email: "admin@ejemplo.com" }))
const headers = new Headers({ origin: "http://localhost:3000" })
describe("primera imagen sobre PostgreSQL real y almacen controlado", () => {
  let conexion: ConexionBd
  let id: string
  let png: Buffer
  const almacen = almacenImagenPrueba()
  const subir = vi.spyOn(almacen, "almacenarImagen")
  const eliminar = vi.spyOn(almacen, "eliminarImagen")
  const servicio = () => crearCargaImagenProducto({ db: conexion.db, exigir, almacen })
  const leer = async () => (await conexion.db.select().from(producto).where(eq(producto.id, id)))[0]
  async function limpiar() {
    await conexion.db.execute(sql`DROP TRIGGER IF EXISTS prueba_fallar_imagen ON producto`)
    await conexion.db.execute(sql`DROP FUNCTION IF EXISTS prueba_fallar_imagen()`)
    await conexion.db.delete(inventario); await conexion.db.delete(producto); await conexion.db.delete(categoria)
  }
  beforeAll(async () => { conexion = crearConexionPruebas(); png = await crearImagenPrueba() })
  beforeEach(async () => {
    await limpiar()
    subir.mockReset().mockImplementation(async ({ publicId }) => referenciaImagenPrueba(publicId))
    eliminar.mockReset().mockResolvedValue()
    id = crypto.randomUUID()
    await conexion.db.transaction(async (tx) => {
      await sembrarCategorias(tx)
      await insertarProductoOcultoConSaldo(tx, id, { nombre: "Collar imagen", precio: "150.50", categoriaCodigo: "collares" }, crearContratoInventario(conexion.db).crearSaldoCero)
    })
  })
  afterAll(async () => { if (conexion) { await limpiar(); await conexion.pool.end() } })

  it("el producto oculto y C0 existen sin imagen antes de cualquier carga", async () => {
    expect(await leer()).toMatchObject({ imagenAssetId: null, publicado: false, version: 1 })
    expect((await conexion.db.select().from(inventario))[0]).toMatchObject({ cantidad: 0, minimo: null })
  })
  it("sin autorizacion no sube ni persiste", async () => {
    const sinSesion = crearCargaImagenProducto({ db: conexion.db, exigir: crearExigirAdministradora(async () => null), almacen })
    await expect(sinSesion(headers, { id, version: 1 }, png)).rejects.toMatchObject({ codigo: "SESION_REQUERIDA" })
    expect(subir).not.toHaveBeenCalled()
    expect((await leer()).imagenAssetId).toBeNull()
  })
  it("rechaza inexistente y version obsoleta antes de contactar al proveedor", async () => {
    await expect(servicio()(headers, { id: crypto.randomUUID(), version: 1 }, png)).rejects.toMatchObject({ codigo: "producto_inexistente" })
    await expect(servicio()(headers, { id, version: 2 }, png)).rejects.toMatchObject({ codigo: "conflicto_version" })
    expect(subir).not.toHaveBeenCalled()
  })
  it("MIME/extension falsos no cambian el contenido decodificado; persiste sin publicar ni tocar C0", async () => {
    const datos = new FormData()
    datos.set("version", "1")
    datos.set("imagen", new File([new Uint8Array(png)], "otra-extension.txt", { type: "text/plain" }))
    const atender = crearManejadorImagenProducto({ exigir, origen: () => "http://localhost:3000", adjuntar: servicio(), alGuardar: () => {} })
    expect((await atender(new Request("http://localhost:3000", { method: "POST", headers, body: datos }), id)).status).toBe(200)
    expect(await leer()).toMatchObject({ version: 2, publicado: false, destacado: false, precio: "150.50", slug: "collar-imagen", imagenFormato: "png", imagenAncho: 12, imagenAlto: 8 })
    expect((await conexion.db.select().from(inventario))[0].cantidad).toBe(0)
    expect(eliminar).not.toHaveBeenCalled()
    await expect(servicio()(headers, { id, version: 2 }, png)).rejects.toMatchObject({ codigo: "imagen_existente" })
    expect(subir).toHaveBeenCalledTimes(1)
  })
  it("archivo falso no toca proveedor ni Producto", async () => {
    await expect(servicio()(headers, { id, version: 1 }, Buffer.from("falso jpg"))).rejects.toMatchObject({ codigo: "tipo_invalido" })
    expect(subir).not.toHaveBeenCalled()
    expect((await leer()).version).toBe(1)
  })
  it("la primera imagen habilita publicacion con version vigente y llega a PDP/SEO sin exponer privados", async () => {
    const publicar = crearPublicacionProductos({ db: conexion.db, exigir })
    expect(await publicar(headers, { id, version: 1, accion: "publicar" })).toEqual({ estado: "imagen_requerida" })
    const carga = await servicio()(headers, { id, version: 1 }, png)
    expect(await publicar(headers, { id, version: 1, accion: "publicar" })).toEqual({ estado: "conflicto_version" })
    expect(await publicar(headers, { id, version: carga.version, accion: "publicar" })).toMatchObject({ estado: "ok", version: 3 })
    const catalogo = crearConsultasCatalogo(conexion.db)
    const publico = await catalogo.consultarPorSlug("collar-imagen")
    expect(publico).toMatchObject({ slug: "collar-imagen", precio: "150.50", disponible: false,
      imagen: { url: carga.imagen.urlSegura, ancho: carga.imagen.ancho, alto: carga.imagen.alto } })
    expect(publico).not.toHaveProperty("imagenAssetId")
    expect(publico).not.toHaveProperty("imagenPublicId")
    expect(publico).not.toHaveProperty("version")
    expect(await catalogo.listar()).toEqual([]) // C0 sigue en cero: PDP agotada, fuera de listados.
    expect(metadataProducto(publico!, "https://tienda.example").openGraph?.images).toEqual([
      expect.objectContaining({ url: carga.imagen.urlSegura, width: carga.imagen.ancho, height: carga.imagen.alto }),
    ])
    expect(await leer()).toMatchObject({ version: 3, publicado: true, destacado: false, slug: "collar-imagen", precio: "150.50" })
    expect(eliminar).not.toHaveBeenCalled()
  })
  it("fallo del proveedor no adjunta y solicita limpieza del id propio por si hubo respuesta perdida", async () => {
    subir.mockRejectedValueOnce(new Error("Fallo controlado del almacen"))
    await expect(servicio()(headers, { id, version: 1 }, png)).rejects.toThrow()
    expect(eliminar).toHaveBeenCalledWith(subir.mock.calls[0][0].publicId)
    expect((await leer()).imagenAssetId).toBeNull()
  })
  it("sin credenciales mantiene el producto oculto intacto y responde no disponible", async () => {
    const sinConfig = crearCargaImagenProducto({ db: conexion.db, exigir, almacen: crearAlmacenCloudinary({}) })
    await expect(sinConfig(headers, { id, version: 1 }, png)).rejects.toMatchObject({ codigo: "servicio_no_disponible" })
    expect((await leer()).imagenAssetId).toBeNull()
  })
  it("upload confirmado + fallo SQL real revierte referencia y limpia el nuevo asset", async () => {
    await conexion.db.execute(sql`CREATE FUNCTION prueba_fallar_imagen() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo deliberado de prueba'; END $$`)
    await conexion.db.execute(sql`CREATE TRIGGER prueba_fallar_imagen BEFORE UPDATE ON producto FOR EACH ROW EXECUTE FUNCTION prueba_fallar_imagen()`)
    await expect(servicio()(headers, { id, version: 1 }, png)).rejects.toThrow()
    expect(eliminar).toHaveBeenCalledExactlyOnceWith(subir.mock.calls[0][0].publicId)
    expect(await leer()).toMatchObject({ version: 1, imagenAssetId: null })
  })
  it("un fallo de cleanup se registra sin exponer el error del proveedor", async () => {
    subir.mockRejectedValueOnce(new Error("Fallo upload"))
    eliminar.mockRejectedValueOnce(new Error("api_secret secreto"))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      await expect(servicio()(headers, { id, version: 1 }, png)).rejects.toThrow()
      expect(log).toHaveBeenCalledWith("[productos.imagen] limpieza pendiente", { recurso: subir.mock.calls[0][0].publicId })
      expect(JSON.stringify(log.mock.calls)).not.toContain("secreto")
    } finally { log.mockRestore() }
  })
  it("dos primeras cargas: una gana y la otra limpia exclusivamente su propio recurso", async () => {
    let liberar!: () => void
    const ambasSubidas = new Promise<void>((resolver) => { liberar = resolver })
    let cantidad = 0
    subir.mockImplementation(async ({ publicId }) => {
      if (++cantidad === 2) liberar()
      await ambasSubidas
      return referenciaImagenPrueba(publicId)
    })
    const resultados = await Promise.allSettled([servicio()(headers, { id, version: 1 }, png), servicio()(headers, { id, version: 1 }, png)])
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { codigo: "conflicto_version" } })
    const guardado = await leer()
    expect(guardado.version).toBe(2)
    expect(eliminar).toHaveBeenCalledTimes(1)
    expect(eliminar.mock.calls[0][0]).not.toBe(guardado.imagenPublicId)
  })
  it("si COMMIT confirmo pero se pierde el acuse, comprueba la referencia y no la elimina", async () => {
    const original = conexion.db.transaction.bind(conexion.db)
    const transaccion = vi.spyOn(conexion.db, "transaction").mockImplementationOnce(async (callback) => { await original(callback); throw new Error("Acuse perdido despues de COMMIT") })
    try {
      expect(await servicio()(headers, { id, version: 1 }, png)).toMatchObject({ estado: "ok", version: 2 })
      expect((await leer()).imagenAssetId).not.toBeNull()
      expect(eliminar).not.toHaveBeenCalled()
    } finally { transaccion.mockRestore() }
  })
})
