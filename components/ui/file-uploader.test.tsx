import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { FileUploader, type EventosSubida } from "./file-uploader"
const validar = vi.fn(), upload = vi.fn(), confirmado = vi.fn()
const archivo = (nombre = "foto.png") => new File(["bytes"], nombre, { type: "image/png" })
const props = { accept: "image/png", maxBytes: 100, instrucciones: "Hasta 100 B", etiqueta: "Archivo", validar, upload, onSuccess: confirmado }
const zona = () => screen.getByRole("button", { name: "Seleccionar archivo para cargar" })
const input = () => screen.getByLabelText("Archivo") as HTMLInputElement
async function elegir(nombre?: string) { fireEvent.change(input(), { target: { files: [archivo(nombre)] } }); await screen.findByText("Archivo seleccionado. Listo para subir.") }
beforeEach(() => {
  validar.mockReset().mockResolvedValue(undefined); upload.mockReset(); confirmado.mockReset()
  vi.stubGlobal("URL", class extends URL { static createObjectURL = vi.fn((f: File) => `blob:${f.name}`); static revokeObjectURL = vi.fn() })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it("idle, teclado Enter/espacio y seleccion manual real sin subida automatica", async () => {
  render(<FileUploader {...props} />)
  expect(zona().closest("[data-estado]")?.getAttribute("data-estado")).toBe("idle")
  const click = vi.spyOn(input(), "click").mockImplementation(() => {})
  zona().focus(); expect(document.activeElement).toBe(zona())
  fireEvent.keyDown(zona(), { key: "Enter" }); fireEvent.keyDown(zona(), { key: " " })
  expect(click).toHaveBeenCalledTimes(2)
  await elegir()
  expect(validar).toHaveBeenCalledWith(expect.any(File), "blob:foto.png")
  expect(screen.getByAltText("Vista previa local seleccionada").getAttribute("src")).toBe("blob:foto.png")
  expect(upload).not.toHaveBeenCalled()
})
it("drag con borde/superficie/copy, nombre si es accesible y salida incluso entre hijos", async () => {
  render(<FileUploader {...props} />)
  const transfer = { files: [archivo()], dropEffect: "copy" }
  fireEvent.dragEnter(zona(), { dataTransfer: transfer })
  fireEvent.dragOver(zona(), { dataTransfer: transfer })
  expect(zona().className).toContain("border-primary")
  expect(zona().className).toContain("bg-primary/10")
  expect(screen.getAllByText("Soltá para cargar").length).toBeGreaterThan(0)
  expect(screen.getByText(/foto.png · 5 B/)).toBeTruthy()
  const hijo = zona().querySelector("p")!
  fireEvent.dragEnter(hijo, { dataTransfer: transfer }); fireEvent.dragLeave(hijo)
  expect(zona().closest("[data-estado]")?.getAttribute("data-estado")).toBe("drag-over")
  fireEvent.dragLeave(zona())
  expect(zona().closest("[data-estado]")?.getAttribute("data-estado")).toBe("idle")
  fireEvent.drop(zona(), { dataTransfer: transfer })
  await screen.findByText("Archivo seleccionado. Listo para subir.")
  expect(upload).not.toHaveBeenCalled()
})
it("validating y error de validacion/tamano, sin transferencia ni preview confirmado", async () => {
  let rechazar!: (e: Error) => void
  validar.mockImplementation(() => new Promise((_, r) => { rechazar = r }))
  render(<FileUploader {...props} />)
  fireEvent.change(input(), { target: { files: [archivo()] } })
  expect(screen.getByRole("status").textContent).toContain("Validando")
  await act(async () => rechazar(new Error("Archivo inválido")))
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Archivo inválido")
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto.png")
  fireEvent.change(input(), { target: { files: [new File([new Uint8Array(101)], "grande.png")] } })
  await screen.findByText("El archivo supera el tamaño permitido.")
  expect(upload).not.toHaveBeenCalled(); expect(confirmado).not.toHaveBeenCalled()
})
it("progreso del transporte, processing indeterminado sin regresion por evento tardio, success real", async () => {
  let resolver!: (r: unknown) => void
  upload.mockImplementation(() => new Promise(r => { resolver = r }))
  render(<FileUploader {...props} />); await elegir()
  fireEvent.click(screen.getByRole("button", { name: "Subir archivo" }))
  const eventos: EventosSubida = upload.mock.calls[0][1]
  act(() => eventos.alProgreso(83))
  expect(screen.getByRole("progressbar").getAttribute("value")).toBe("83")
  act(() => eventos.alProcesar()); act(() => eventos.alProgreso(99))
  expect(screen.getByRole("status").textContent).toBe("Procesando archivo…")
  expect(screen.getByRole("progressbar").hasAttribute("value")).toBe(false)
  expect(confirmado).not.toHaveBeenCalled()
  await act(async () => resolver({ vista: { url: "https://example.test/guardado.png" }, resultado: "confirmado" }))
  expect(screen.getByText("Archivo cargado")).toBeTruthy()
  expect(screen.getByAltText("Archivo vigente").getAttribute("src")).toBe("https://example.test/guardado.png")
  expect(screen.getByText("foto.png")).toBeTruthy(); expect(screen.getByText(/image\/png · 5 B/)).toBeTruthy()
  expect(confirmado).toHaveBeenCalledWith("confirmado", upload.mock.calls[0][0])
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto.png")
})
it("error conserva File; reintenta desde inicio, elegir otro/quitar liberan URL", async () => {
  upload.mockRejectedValue(new Error("Error controlado"))
  render(<FileUploader {...props} />); await elegir()
  fireEvent.click(screen.getByRole("button", { name: "Subir archivo" })); await screen.findByRole("alert")
  const original = upload.mock.calls[0][0]
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
  await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
  expect(upload.mock.calls[1][0]).toBe(original)
  expect(screen.getByText(/desde el inicio/)).toBeTruthy()
  fireEvent.change(input(), { target: { files: [archivo("otra.png")] } })
  await screen.findByText("Archivo seleccionado. Listo para subir.")
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto.png")
  fireEvent.click(screen.getByRole("button", { name: "Quitar selección" }))
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:otra.png")
  expect(screen.queryByAltText("Vista previa local seleccionada")).toBeNull()
})
it("archivo persistido sin File muestra preview; fallar reemplazo conserva A y B local", async () => {
  upload.mockRejectedValue(new Error("Upload rechazado"))
  render(<FileUploader {...props} currentPreview={{ url: "https://example.test/A.png", tipo: "image/png" }} />)
  fireEvent.click(screen.getByRole("button", { name: "Cambiar archivo" })); await elegir()
  fireEvent.click(screen.getByRole("button", { name: "Subir archivo" })); await screen.findByRole("alert")
  expect(screen.getByAltText("Archivo vigente").getAttribute("src")).toBe("https://example.test/A.png")
  expect(screen.getByAltText("Vista previa local seleccionada")).toBeTruthy()
  expect(confirmado).not.toHaveBeenCalled()
})
it("unmount aborta la transferencia y libera preview sin confirmar respuestas tardias", async () => {
  let resolver!: (r: unknown) => void
  upload.mockImplementation(() => new Promise(r => { resolver = r }))
  const { unmount } = render(<FileUploader {...props} />); await elegir()
  fireEvent.click(screen.getByRole("button", { name: "Subir archivo" }))
  const signal = upload.mock.calls[0][2] as AbortSignal
  unmount(); expect(signal.aborted).toBe(true)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto.png")
  await act(async () => resolver({ vista: { url: "https://example.test/B.png" }, resultado: "tardio" }))
  expect(confirmado).not.toHaveBeenCalled()
})

it("drop de varios archivos se rechaza sin crear cola ni transferir", async () => {
  render(<FileUploader {...props} />)
  fireEvent.drop(zona(), { dataTransfer: { files: [archivo("A.png"), archivo("B.png")] } })
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Seleccioná un solo archivo.")
  expect(validar).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled()
})
