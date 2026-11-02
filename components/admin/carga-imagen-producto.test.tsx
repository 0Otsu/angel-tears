import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CargaImagenProducto } from "./carga-imagen-producto"
import { MAXIMO_BYTES_IMAGEN, mensajesErrorImagen, type ResultadoImagen } from "@/lib/modulos/productos/imagen-contrato"
import { referenciaImagenPrueba } from "@/pruebas/imagenes-producto"

const { enviar, refresh } = vi.hoisted(() => ({ enviar: vi.fn(), refresh: vi.fn() }))
vi.mock("@/lib/modulos/productos/imagen-cliente", () => ({ enviarImagenProducto: enviar }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
const props = { productoId: "0df1dcbb-13c4-4567-94e0-6c6f9407a112", nombre: "Collar", version: 1, tieneImagen: false }
type ImagenSimulada = { onload: (() => void) | null; onerror: (() => void) | null; naturalWidth: number; naturalHeight: number; src: string }
let imagenes: ImagenSimulada[]
const archivo = () => new File(["contenido local probado por el decoder en servidor"], "collar.png", { type: "image/png" })
const input = () => screen.getByLabelText("Archivo de imagen principal") as HTMLInputElement
const elegir = async () => {
  fireEvent.change(input(), { target: { files: [archivo()] } })
  await act(async () => { imagenes.at(-1)!.onload?.() })
  await screen.findByText("Archivo seleccionado. Listo para subir.")
}
beforeEach(() => {
  enviar.mockReset(); refresh.mockReset(); imagenes = []
  vi.stubGlobal("Image", class {
    onload = null; onerror = null; naturalWidth = 12; naturalHeight = 8; src = ""
    constructor() { imagenes.push(this) }
  })
  vi.stubGlobal("URL", class extends URL { static createObjectURL = vi.fn(() => "blob:preview-local"); static revokeObjectURL = vi.fn() })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe("control accesible de primera imagen", () => {
  it("vacio: input real, boton por teclado, instrucciones y aviso opcional", () => {
    render(<CargaImagenProducto {...props} />)
    expect(input().type).toBe("file")
    expect(input().getAttribute("accept")).toBe("image/jpeg,image/png,image/webp")
    expect(screen.getByText(/La imagen es opcional/)).toBeTruthy()
    const click = vi.spyOn(input(), "click").mockImplementation(() => {})
    const boton = screen.getByRole("button", { name: "Seleccionar imagen" })
    boton.focus(); expect(document.activeElement).toBe(boton)
    fireEvent.click(boton)
    expect(click).toHaveBeenCalled()
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite")
  })
  it("seleccion por input valida de verdad en navegador y habilita preview/subida", async () => {
    render(<CargaImagenProducto {...props} />)
    fireEvent.change(input(), { target: { files: [archivo()] } })
    expect(screen.getByRole("status").textContent).toContain("Validando")
    expect(enviar).not.toHaveBeenCalled()
    await act(async () => { imagenes[0].onload?.() })
    expect(await screen.findByAltText(/Vista previa/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Subir imagen" })).toBeTruthy()
  })
  it("drag-over y drop de un archivo usan el mismo camino de seleccion", async () => {
    render(<CargaImagenProducto {...props} />)
    const zona = screen.getByRole("button", { name: "Seleccionar archivo para cargar" })
    fireEvent.dragOver(zona, { dataTransfer: { dropEffect: "copy" } })
    expect(screen.getByRole("status").textContent).toContain("Soltá para cargar")
    fireEvent.drop(zona, { dataTransfer: { files: [archivo()] } })
    expect(screen.getByRole("status").textContent).toContain("Validando")
    await act(async () => { imagenes[0].onload?.() })
    expect(await screen.findByText("Archivo seleccionado. Listo para subir.")).toBeTruthy()
  })
  it("archivo invalido muestra error textual y no habilita upload", async () => {
    render(<CargaImagenProducto {...props} />)
    fireEvent.change(input(), { target: { files: [new File(["falso"], "falso.svg", { type: "image/svg+xml" })] } })
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Subir imagen" })).toBeNull()
    expect(enviar).not.toHaveBeenCalled()
  })
  it("rechaza bytes excesivos y dimensiones excesivas en la ayuda de cliente", async () => {
    render(<CargaImagenProducto {...props} />)
    const grande = new File([new Uint8Array(MAXIMO_BYTES_IMAGEN + 1)], "grande.png", { type: "image/png" })
    fireEvent.change(input(), { target: { files: [grande] } })
    expect(await screen.findByText(mensajesErrorImagen.exceso_bytes)).toBeTruthy()
    fireEvent.change(input(), { target: { files: [archivo()] } })
    imagenes[0].naturalWidth = 5000; imagenes[0].naturalHeight = 5000
    await act(async () => { imagenes[0].onload?.() })
    expect(await screen.findByText(mensajesErrorImagen.exceso_pixeles)).toBeTruthy()
  })
  it("progreso real, procesamiento indeterminado y exito solo tras confirmacion", async () => {
    let resolver!: (resultado: ResultadoImagen) => void
    enviar.mockReturnValue(new Promise<ResultadoImagen>((r) => { resolver = r }))
    render(<CargaImagenProducto {...props} />)
    await elegir()
    fireEvent.click(screen.getByRole("button", { name: "Subir imagen" }))
    expect(screen.getByRole("progressbar").hasAttribute("value")).toBe(false)
    const eventos = enviar.mock.calls[0][2]
    act(() => eventos.alProgreso(37))
    expect(screen.getByRole("status").textContent).toContain("37 %")
    expect(screen.getByRole("progressbar").getAttribute("value")).toBe("37")
    act(() => eventos.alProcesar())
    expect(screen.getByRole("status").textContent).toContain("Procesando imagen")
    expect(screen.getByRole("progressbar").hasAttribute("value")).toBe(false)
    expect(refresh).not.toHaveBeenCalled()
    await act(async () => resolver({ estado: "ok", productoId: props.productoId, version: 2, imagen: referenciaImagenPrueba("recurso") }))
    expect(screen.getByRole("status").textContent).toContain("guardada correctamente")
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("button", { name: "Subir imagen" })).toBeNull()
  })
  it("error y reintento conservan archivo/preview sin timers ni reenvio automatico", async () => {
    enviar.mockResolvedValueOnce({ estado: "error", codigo: "error_proveedor", mensaje: mensajesErrorImagen.error_proveedor })
    let resolver!: (resultado: ResultadoImagen) => void
    enviar.mockImplementationOnce(() => new Promise<ResultadoImagen>((r) => { resolver = r }))
    render(<CargaImagenProducto {...props} />)
    await elegir()
    fireEvent.click(screen.getByRole("button", { name: "Subir imagen" }))
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(screen.getByAltText(/Vista previa/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(screen.getByRole("status").textContent).toContain("Subiendo")
    expect((enviar.mock.calls[1][1] as FormData).get("imagen")).toBeInstanceOf(File)
    await act(async () => resolver({ estado: "error", codigo: "error_proveedor", mensaje: mensajesErrorImagen.error_proveedor }))
    expect(enviar).toHaveBeenCalledTimes(2)
  })
  it("sesion vencida conserva preview y solicita ingreso sin reenviar", async () => {
    enviar.mockResolvedValue({ estado: "error", codigo: "sesion_requerida", mensaje: mensajesErrorImagen.sesion_requerida })
    render(<CargaImagenProducto {...props} />)
    await elegir()
    fireEvent.click(screen.getByRole("button", { name: "Subir imagen" }))
    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeTruthy()
    expect((screen.getByRole("button", { name: "Reintentar" }) as HTMLButtonElement).disabled).toBe(true)
  })
  it("imagen existente no ofrece sobrescribirla", () => {
    render(<CargaImagenProducto {...props} tieneImagen />)
    expect(screen.getByRole("status").textContent).toContain("ya tiene una imagen")
    expect(screen.queryByRole("button", { name: "Seleccionar imagen" })).toBeNull()
    expect(enviar).not.toHaveBeenCalled()
  })
  it("libera el object URL al desmontar", async () => {
    const { unmount } = render(<CargaImagenProducto {...props} />)
    await elegir()
    unmount()
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-local"))
  })
})

describe("reemplazo minimo con imagen vigente separada del preview", () => {
  const anterior = { urlSegura: "https://example.test/anterior.png", ancho: 640, alto: 480 }
  const iniciar = () => {
    render(<CargaImagenProducto {...props} version={2} tieneImagen imagenActual={anterior} />)
    fireEvent.click(screen.getByRole("button", { name: "Cambiar imagen" }))
  }
  it("muestra A y permite cancelar seleccion/B sin enviar ni perder A", async () => {
    iniciar()
    await elegir()
    expect(screen.getByAltText("Imagen actual de Collar").getAttribute("src")).toBe(anterior.urlSegura)
    expect(screen.getByAltText(/Vista previa/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Quitar selección" }))
    expect(screen.queryByAltText(/Vista previa/)).toBeNull()
    expect(screen.getByAltText("Imagen actual de Collar").getAttribute("src")).toBe(anterior.urlSegura)
    expect(screen.getByRole("button", { name: "Cambiar imagen" })).toBeTruthy()
    expect(enviar).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-local")
  })
  it("cancelar durante validacion ignora la respuesta tardia del decoder de navegador", async () => {
    iniciar()
    fireEvent.change(input(), { target: { files: [archivo()] } })
    fireEvent.click(screen.getByRole("button", { name: "Quitar selección" }))
    await act(async () => imagenes[0].onload?.())
    expect(screen.queryByAltText(/Vista previa/)).toBeNull()
    expect(enviar).not.toHaveBeenCalled()
  })
  it("upload fallido mantiene A/preview y reintenta solo bajo accion humana con PUT", async () => {
    enviar.mockResolvedValue({ estado: "error", codigo: "error_proveedor", mensaje: mensajesErrorImagen.error_proveedor })
    iniciar(); await elegir()
    fireEvent.click(screen.getByRole("button", { name: "Guardar nueva imagen" }))
    await screen.findByRole("alert")
    expect(screen.getByAltText("Imagen actual de Collar").getAttribute("src")).toBe(anterior.urlSegura)
    expect(screen.getByAltText(/Vista previa/)).toBeTruthy()
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar.mock.calls[0][4]).toBe("reemplazo")
    expect(enviar.mock.calls[0][1].get("version")).toBe("2")
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2))
  })
  it("exito muestra B/version nueva y aviso de cleanup sin simular fallo del guardado", async () => {
    const nueva = { ...referenciaImagenPrueba("B"), urlSegura: "https://example.test/nueva.png" }
    enviar.mockResolvedValue({ estado: "ok", productoId: props.productoId, version: 3, imagen: nueva, limpiezaPendiente: true })
    iniciar(); await elegir()
    fireEvent.click(screen.getByRole("button", { name: "Guardar nueva imagen" }))
    await screen.findByText("Imagen principal reemplazada correctamente.")
    expect(screen.getByAltText("Imagen actual de Collar").getAttribute("src")).toBe(nueva.urlSegura)
    expect(screen.getByRole("note").textContent).toContain("pendiente limpiar")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(refresh).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Cambiar imagen" }))
    await elegir()
    fireEvent.click(screen.getByRole("button", { name: "Guardar nueva imagen" }))
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2))
    expect(enviar.mock.calls[1][1].get("version")).toBe("3")
  })
  it("conflicto conserva A y exige recargar antes de reintentar", async () => {
    enviar.mockResolvedValue({ estado: "error", codigo: "conflicto_version", mensaje: mensajesErrorImagen.conflicto_version })
    iniciar(); await elegir()
    fireEvent.click(screen.getByRole("button", { name: "Guardar nueva imagen" }))
    await screen.findByRole("alert")
    expect(screen.getByAltText("Imagen actual de Collar").getAttribute("src")).toBe(anterior.urlSegura)
    expect((screen.getByRole("button", { name: "Reintentar" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Recargar listado" }))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(enviar).toHaveBeenCalledTimes(1)
  })
})
