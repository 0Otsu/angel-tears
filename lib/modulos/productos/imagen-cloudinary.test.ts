import { PassThrough } from "node:stream"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { crearAlmacenCloudinary } from "./imagen-cloudinary"

const { subir, eliminar } = vi.hoisted(() => ({ subir: vi.fn(), eliminar: vi.fn() }))
vi.mock("cloudinary", () => ({ v2: { uploader: { upload_stream: subir, destroy: eliminar } } }))
const entorno = { CLOUDINARY_CLOUD_NAME: "pruebas", CLOUDINARY_API_KEY: "key-ficticia", CLOUDINARY_API_SECRET: "secret-ficticio" }
const publicId = "angel-tears/desarrollo/productos/ejemplo/recurso"
const respuesta = { asset_id: "asset", public_id: publicId, version: 1, secure_url: `https://res.cloudinary.com/pruebas/image/upload/v1/${publicId}.png`, width: 12, height: 8, format: "png", resource_type: "image", bytes: 100 }
let respuestaProveedor: Record<string, unknown>
let fallo: Error | null
let recibido: Buffer[]
const registro = vi.fn()
beforeEach(() => {
  registro.mockReset(); vi.spyOn(console, "error").mockImplementation(registro)
  subir.mockReset(); eliminar.mockReset()
  respuestaProveedor = { ...respuesta }; fallo = null; recibido = []
  subir.mockImplementation((_opciones, callback) => {
    const stream = new PassThrough()
    stream.on("data", (trozo) => recibido.push(trozo))
    stream.on("finish", () => callback(fallo, respuestaProveedor))
    return stream
  })
  eliminar.mockResolvedValue({ result: "ok" })
})
afterEach(() => { vi.restoreAllMocks() })

describe("adapter Cloudinary (SDK sustituido, sin red)", () => {
  it("carga autenticada sin transformaciones, devuelve solo referencia validada", async () => {
    const almacen = crearAlmacenCloudinary(entorno)
    const contenido = new Uint8Array([1, 2, 3])
    const imagen = await almacen.almacenarImagen({ contenido, publicId })
    expect(subir.mock.calls[0][0]).toMatchObject({ cloud_name: "pruebas", api_key: entorno.CLOUDINARY_API_KEY, api_secret: entorno.CLOUDINARY_API_SECRET, public_id: publicId, overwrite: false, resource_type: "image" })
    expect(subir.mock.calls[0][0]).not.toHaveProperty("transformation")
    expect(Buffer.concat(recibido)).toEqual(Buffer.from(contenido))
    expect(imagen).toMatchObject({ publicId, assetId: "asset", versionProveedor: "1", formato: "png" })
    expect(imagen).not.toHaveProperty("api_secret")
    expect(imagen).not.toHaveProperty("resource_type")
    expect(registro).not.toHaveBeenCalled()
  })
  it("sin configuracion no llama al SDK", async () => {
    await expect(crearAlmacenCloudinary({}).almacenarImagen({ contenido: new Uint8Array(), publicId })).rejects.toMatchObject({ codigo: "servicio_no_disponible" })
    expect(subir).not.toHaveBeenCalled()
  })
  it("normaliza el formato jpg del proveedor al jpeg del contrato, sin transformar el archivo", async () => {
    respuestaProveedor = { ...respuestaProveedor, format: "jpg" }
    expect(await crearAlmacenCloudinary(entorno).almacenarImagen({ contenido: new Uint8Array([1, 2, 3]), publicId })).toMatchObject({ formato: "jpeg" })
    expect(Buffer.concat(recibido)).toEqual(Buffer.from([1, 2, 3]))
  })
  it.each([{ secure_url: "http://res.cloudinary.com/pruebas/image/upload/imagen.png" }, { public_id: "ajeno" }, { secure_url: "https://ajeno.test/imagen.png" }, { width: 20_000, height: 20_000 }, { format: "gif" }, { asset_id: "" }])("rechaza respuesta inesperada del proveedor: %j", async (cambio) => {
    respuestaProveedor = { ...respuestaProveedor, ...cambio }
    await expect(crearAlmacenCloudinary(entorno).almacenarImagen({ contenido: new Uint8Array(), publicId })).rejects.toMatchObject({ codigo: "error_proveedor" })
  })
  it("convierte un error del SDK a un mensaje neutro sin arrastrar secretos", async () => {
    fallo = new Error("api_secret=valor que no debe salir")
    await expect(crearAlmacenCloudinary(entorno).almacenarImagen({ contenido: new Uint8Array(), publicId })).rejects.toMatchObject({ message: "No pudimos almacenar la imagen. Podés reintentar." })
  })
  it.each([
    [401, "Unknown API key dato-privado", "clave_api_rechazada"],
    [401, "Invalid Signature dato-privado", "firma_rechazada"],
    [400, "Invalid cloud_name dato-privado", "cuenta_rechazada"],
    [403, "dato-privado", "autenticacion_o_permisos"],
    [500, "dato-privado", "fallo_sdk"],
  ])("diagnostica HTTP %s sin registrar el mensaje del proveedor", async (http, mensaje, categoria) => {
    fallo = Object.assign(new Error(mensaje), { http_code: http })
    await expect(crearAlmacenCloudinary(entorno).almacenarImagen({ contenido: new Uint8Array(), publicId })).rejects.toMatchObject({ codigo: "error_proveedor", status: 502 })
    expect(registro).toHaveBeenCalledWith("[productos.imagen] fallo Cloudinary", expect.objectContaining({ etapa: "sdk", categoria, http, configuracionPresente: { CLOUDINARY_CLOUD_NAME: true, CLOUDINARY_API_KEY: true, CLOUDINARY_API_SECRET: true } }))
    const log = JSON.stringify(registro.mock.calls)
    for (const privado of ["dato-privado", entorno.CLOUDINARY_CLOUD_NAME, entorno.CLOUDINARY_API_KEY, entorno.CLOUDINARY_API_SECRET, publicId]) expect(log).not.toContain(privado)
  })
  it("distingue fallo de red y descarta codigos arbitrarios y datos de errores", async () => {
    fallo = Object.assign(new Error("host-privado"), { code: "ECONNRESET" })
    await expect(crearAlmacenCloudinary(entorno).almacenarImagen({ contenido: new Uint8Array(), publicId })).rejects.toMatchObject({ status: 502 })
    expect(registro.mock.calls[0][1]).toMatchObject({ etapa: "sdk", categoria: "comunicacion", codigoRed: "ECONNRESET" })
    fallo = Object.assign(new Error("host-privado"), { code: "codigo-privado", http_code: "texto-privado" })
    await crearAlmacenCloudinary(entorno).almacenarImagen({ contenido: new Uint8Array(), publicId }).catch(() => undefined)
    const log = JSON.stringify(registro.mock.calls)
    for (const privado of ["host-privado", "codigo-privado", "texto-privado"]) expect(log).not.toContain(privado)
  })
  it.each([
    [{ asset_id: "" }, "respuesta"],
    [{ secure_url: "https://ajeno.test/dato-privado" }, "referencia"],
  ])("distingue validacion de respuesta/referencia sin registrarlas", async (cambio, etapa) => {
    respuestaProveedor = { ...respuestaProveedor, ...cambio }
    await expect(crearAlmacenCloudinary(entorno).almacenarImagen({ contenido: new Uint8Array(), publicId })).rejects.toMatchObject({ status: 502 })
    expect(registro.mock.calls[0][1]).toMatchObject({ etapa, categoria: "respuesta_no_valida" })
    expect(JSON.stringify(registro.mock.calls)).not.toContain("dato-privado")
    expect(JSON.stringify(registro.mock.calls)).not.toContain(publicId)
  })
  it("elimina exclusivamente el id suministrado y acepta not found como limpieza idempotente", async () => {
    eliminar.mockResolvedValue({ result: "not found" })
    await crearAlmacenCloudinary(entorno).eliminarImagen(publicId)
    expect(eliminar.mock.calls[0][0]).toBe(publicId)
    expect(eliminar.mock.calls[0][1]).toMatchObject({ resource_type: "image", invalidate: true })
  })
})
