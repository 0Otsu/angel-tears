import { describe, expect, it, vi } from "vitest"
import { crearExigirAdministradora } from "@/lib/modulos/autenticacion/contrato"
import { crearManejadorImagenProducto } from "./imagen-http"
import { ErrorImagen, MAXIMO_BYTES_IMAGEN, MAXIMO_BYTES_MULTIPART, type ImagenGuardada } from "./imagen-contrato"
import { crearImagenPrueba, referenciaImagenPrueba } from "@/pruebas/imagenes-producto"

const id = "0df1dcbb-13c4-4567-94e0-6c6f9407a112"
const origen = "http://localhost:3000"
function preparar(autorizada = true) {
  const adjuntar = vi.fn<(encabezados: Headers, referencia: unknown, contenido: Uint8Array) => Promise<ImagenGuardada>>(async () => ({ estado: "ok", productoId: id, version: 2, imagen: referenciaImagenPrueba("recurso") }))
  const alGuardar = vi.fn()
  const atender = crearManejadorImagenProducto({ exigir: crearExigirAdministradora(async () => autorizada ? { id: "admin", nombre: "Admin", email: "admin@ejemplo.com" } : null), origen: () => origen, adjuntar, alGuardar })
  return { atender, adjuntar, alGuardar }
}
async function solicitud(bytes?: Uint8Array, origenRequest = origen) {
  const datos = new FormData()
  datos.set("version", "1")
  datos.set("imagen", new File([new Uint8Array(bytes ?? await crearImagenPrueba())], "engañoso.txt", { type: "text/plain" }))
  return new Request(`${origen}/api/admin/productos/${id}/imagen`, { method: "POST", headers: { origin: origenRequest }, body: datos })
}

describe("multipart protegido de Producto", () => {
  it("sin sesion no consume el cuerpo ni invoca almacenamiento", async () => {
    const { atender, adjuntar } = preparar(false)
    const request = await solicitud()
    expect((await atender(request, id)).status).toBe(401)
    expect(request.bodyUsed).toBe(false)
    expect(adjuntar).not.toHaveBeenCalled()
  })
  it.each(["https://otro.example", "null", ""])("rechaza origen %s antes de leer el archivo", async (host) => {
    const { atender, adjuntar } = preparar()
    const request = await solicitud(undefined, host)
    expect((await atender(request, id)).status).toBe(403)
    expect(request.bodyUsed).toBe(false)
    expect(adjuntar).not.toHaveBeenCalled()
  })
  it("pasa los bytes reales y version al caso de uso sin confiar en MIME/extension", async () => {
    const { atender, adjuntar, alGuardar } = preparar()
    const bytes = await crearImagenPrueba()
    const respuesta = await atender(await solicitud(bytes), id)
    expect(respuesta.status).toBe(200)
    expect(adjuntar.mock.calls[0]).toEqual([expect.any(Headers), { id, version: "1" }, new Uint8Array(bytes)])
    expect(alGuardar).toHaveBeenCalledTimes(1)
    expect(respuesta.headers.get("cache-control")).toBe("no-store")
  })
  it("rechaza archivo mayor que 3 MiB aun dentro del margen multipart", async () => {
    const { atender, adjuntar } = preparar()
    expect((await atender(await solicitud(new Uint8Array(MAXIMO_BYTES_IMAGEN + 1)), id)).status).toBe(413)
    expect(adjuntar).not.toHaveBeenCalled()
  })
  it("limita el stream aunque content-length mienta", async () => {
    const { atender, adjuntar } = preparar()
    let pasos = 0
    const cancel = vi.fn()
    const body = new ReadableStream({ pull(controlador) { controlador.enqueue(new Uint8Array(pasos++ === 0 ? MAXIMO_BYTES_MULTIPART : 1)) }, cancel })
    const init = { method: "POST", headers: { origin: origen, "content-type": "multipart/form-data; boundary=x", "content-length": "1" }, body, duplex: "half" }
    const respuesta = await atender(new Request(origen, init), id)
    expect(respuesta.status).toBe(413)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(adjuntar).not.toHaveBeenCalled()
  })
  it("rechaza campos multiples y multipart malformado", async () => {
    const { atender, adjuntar } = preparar()
    const datos = new FormData()
    datos.set("version", "1")
    datos.append("imagen", new File(["1"], "1.jpg"))
    datos.append("imagen", new File(["2"], "2.jpg"))
    expect((await atender(new Request(origen, { method: "POST", headers: { origin: origen }, body: datos }), id)).status).toBe(400)
    expect((await atender(new Request(origen, { method: "POST", headers: { origin: origen, "content-type": "multipart/form-data; boundary=x" }, body: "malformado" }), id)).status).toBe(400)
    expect(adjuntar).not.toHaveBeenCalled()
  })
  it("propaga errores controlados sin revalidar y oculta detalles tecnicos", async () => {
    const { atender, adjuntar, alGuardar } = preparar()
    adjuntar.mockRejectedValueOnce(new ErrorImagen("imagen_existente", 409))
    expect((await atender(await solicitud(), id)).status).toBe(409)
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      adjuntar.mockRejectedValueOnce(new Error("SQL api_secret secreto"))
      const respuesta = await atender(await solicitud(), id)
      expect(respuesta.status).toBe(500)
      expect(await respuesta.text()).not.toContain("SQL")
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/api_secret|secreto/)
      expect(alGuardar).not.toHaveBeenCalled()
    } finally { log.mockRestore() }
  })
})
