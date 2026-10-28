import { afterEach, describe, expect, it, vi } from "vitest"
import { enviarImagenProducto } from "./imagen-cliente"

class XhrPrueba {
  static actual: XhrPrueba
  status = 503; responseText = ""; timeout = 0
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null, onload: null as (() => void) | null }
  onload: (() => void) | null = null; onerror: (() => void) | null = null; ontimeout: (() => void) | null = null; onabort: (() => void) | null = null; onloadend: (() => void) | null = null
  open = vi.fn(); send = vi.fn(); abort = vi.fn(() => this.onabort?.())
  constructor() { XhrPrueba.actual = this }
}
afterEach(() => vi.unstubAllGlobals())
describe("transporte XHR real por eventos (sin timers de progreso)", () => {
  it("calcula solo progreso computable y espera respuesta antes de resolver", async () => {
    vi.stubGlobal("XMLHttpRequest", XhrPrueba)
    const alProgreso = vi.fn(); const alProcesar = vi.fn()
    const peticion = enviarImagenProducto("id", new FormData(), { alProgreso, alProcesar }, new AbortController().signal)
    const xhr = XhrPrueba.actual
    xhr.upload.onprogress?.({ loaded: 30, total: 100, lengthComputable: true } as ProgressEvent)
    xhr.upload.onprogress?.({ loaded: 30, total: 0, lengthComputable: false } as ProgressEvent)
    expect(alProgreso.mock.calls).toEqual([[30], [null]])
    xhr.upload.onload?.()
    expect(alProcesar).toHaveBeenCalledTimes(1)
    xhr.responseText = JSON.stringify({ estado: "error", codigo: "servicio_no_disponible", mensaje: "No mostrar texto arbitrario" })
    xhr.onload?.()
    expect(await peticion).toMatchObject({ estado: "error", codigo: "servicio_no_disponible", mensaje: "La carga de imágenes no está disponible en este momento. Intentá más tarde." })
  })
  it("fallo de red resuelve error neutro sin interpretar un HTML de proxy", async () => {
    vi.stubGlobal("XMLHttpRequest", XhrPrueba)
    const peticion = enviarImagenProducto("id", new FormData(), { alProgreso: vi.fn(), alProcesar: vi.fn() }, new AbortController().signal)
    const xhr = XhrPrueba.actual
    xhr.responseText = "<html>SQL secreto</html>"
    xhr.onload?.()
    expect(await peticion).toMatchObject({ estado: "error", codigo: "error_tecnico" })
  })
})
