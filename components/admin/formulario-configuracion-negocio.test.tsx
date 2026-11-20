import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import { FormularioConfiguracionNegocio } from "./formulario-configuracion-negocio"

const { guardar } = vi.hoisted(() => ({ guardar: vi.fn() }))
vi.mock("@/app/admin/(panel)/configuracion/acciones", () => ({ guardarConfiguracionAccion: guardar }))

// Radix enfoca la opción seleccionada al abrir. jsdom no implementa el scroll.
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() })

it("mantiene los datos con errores y confirma un nuevo guardado", async () => {
  guardar.mockResolvedValueOnce({ estado: "datos_invalidos", errores: { comoLlegar: ["Enlace de Maps inválido."] } })
    .mockResolvedValueOnce({ estado: "ok", configuracion: configuracionPrueba })
  render(<FormularioConfiguracionNegocio inicial={configuracionPrueba} />)
  const nombre = screen.getByLabelText<HTMLInputElement>("Calle y número")
  const mapa = screen.getByLabelText<HTMLInputElement>("Enlace de Google Maps")
  fireEvent.change(nombre, { target: { value: "Otro local" } })
  fireEvent.change(mapa, { target: { value: "https://example.test/" } })
  fireEvent.click(screen.getByRole("checkbox", { name: "Martes" }))
  const form = screen.getByRole("form", { name: "Configuración del negocio" })
  fireEvent.submit(form)
  await screen.findByText("Enlace de Maps inválido.")
  expect(nombre.value).toBe("Otro local")
  expect(mapa.value).toBe("https://example.test/")
  expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Martes" }).checked).toBe(true)
  fireEvent.change(mapa, { target: { value: configuracionPrueba.comoLlegar } })
  fireEvent.submit(form)
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Configuración guardada."))
  const datos = guardar.mock.calls[1][1] as FormData
  expect(datos.get("direccion")).toBe("Otro local")
  expect(datos.getAll("diasAtencion")).toEqual(["lunes", "martes", "sabado"])
})

it("elige un horario con teclado y conserva un cierre fuera de los intervalos", async () => {
  guardar.mockResolvedValueOnce({ estado: "datos_invalidos", errores: { apertura: ["Revisá la apertura."] } })
  const { unmount } = render(<FormularioConfiguracionNegocio inicial={configuracionPrueba} />)
  const apertura = screen.getByRole("combobox", { name: "Apertura" })
  const cierre = screen.getByRole("combobox", { name: "Cierre" })
  expect(apertura.textContent).toBe("09:30")
  expect(cierre.textContent).toBe("12:15")
  apertura.focus()
  fireEvent.keyDown(apertura, { key: "ArrowDown" })
  const opcion = await screen.findByRole("option", { name: "09:45" })
  fireEvent.keyDown(opcion, { key: "Enter" })
  expect(apertura.textContent).toBe("09:45")
  fireEvent.submit(screen.getByRole("form", { name: "Configuración del negocio" }))
  await screen.findByText("Revisá la apertura.")
  const enviado = guardar.mock.lastCall![1] as FormData
  expect(enviado.get("apertura")).toBe("09:45")
  expect(apertura.getAttribute("aria-invalid")).toBe("true")
  expect(apertura.textContent).toBe("09:45")
  unmount()
  render(<FormularioConfiguracionNegocio inicial={{ ...configuracionPrueba, apertura: "09:45", cierre: "12:07" }} />)
  const cierreGuardado = screen.getByRole("combobox", { name: "Cierre" })
  expect(cierreGuardado.textContent).toBe("12:07")
  fireEvent.keyDown(cierreGuardado, { key: "ArrowDown" })
  expect(await screen.findByRole("option", { name: "12:07" })).toBeTruthy()
})
