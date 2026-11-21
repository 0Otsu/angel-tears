import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import { FormularioConfiguracionNegocio } from "./formulario-configuracion-negocio"

const { guardar } = vi.hoisted(() => ({ guardar: vi.fn() }))
vi.mock("@/app/admin/(panel)/configuracion/acciones", () => ({ guardarConfiguracionAccion: guardar }))

// Radix enfoca la opción seleccionada al abrir. jsdom no implementa el scroll.
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() })

beforeEach(() => guardar.mockReset())

it("conserva el borrador de horarios y dirección tras un rechazo del servidor", async () => {
  guardar.mockResolvedValueOnce({ estado: "datos_invalidos", errores: { comoLlegar: ["Enlace de Maps inválido."] } })
    .mockResolvedValueOnce({ estado: "ok", configuracion: configuracionPrueba })
  render(<FormularioConfiguracionNegocio inicial={configuracionPrueba} />)
  const nombre = screen.getByLabelText<HTMLInputElement>("Calle y número")
  const mapa = screen.getByLabelText<HTMLInputElement>("Enlace de Google Maps")
  fireEvent.change(nombre, { target: { value: "Otro local" } })
  fireEvent.change(mapa, { target: { value: "https://example.test/" } })
  fireEvent.click(screen.getByRole("button", { name: "Editar Lunes" }))
  fireEvent.click(screen.getByRole("button", { name: "Aplicar este horario de lunes a viernes" }))
  fireEvent.click(screen.getByRole("button", { name: "Editar Sábado" }))
  const cerrado = screen.getByRole<HTMLInputElement>("checkbox", { name: "Día cerrado" })
  fireEvent.click(cerrado)
  const form = screen.getByRole("form", { name: "Configuración del negocio" })
  fireEvent.submit(form)
  await screen.findByText("Enlace de Maps inválido.")
  expect(nombre.value).toBe("Otro local")
  expect(mapa.value).toBe("https://example.test/")
  expect(cerrado.checked).toBe(true)
  fireEvent.change(mapa, { target: { value: configuracionPrueba.comoLlegar } })
  fireEvent.submit(form)
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Configuración guardada."))
  const datos = guardar.mock.calls[1][1] as FormData
  expect(datos.get("direccion")).toBe("Otro local")
  const franja = configuracionPrueba.horarios.lunes
  expect(JSON.parse(String(datos.get("horarios")))).toEqual({
    lunes: franja, martes: franja, miercoles: franja, jueves: franja, viernes: franja, sabado: [], domingo: [],
  })
})

it("elige un horario con teclado y conserva un cierre fuera de los intervalos", async () => {
  guardar.mockResolvedValueOnce({ estado: "datos_invalidos", errores: { horarios: ["Revisá los horarios."] } })
  const horarios = { ...configuracionPrueba.horarios, lunes: [{ apertura: "09:30", cierre: "12:07" }] }
  render(<FormularioConfiguracionNegocio inicial={{ ...configuracionPrueba, horarios }} />)
  fireEvent.click(screen.getByRole("button", { name: "Editar Lunes" }))
  const grupo = within(screen.getByRole("group", { name: "Horario de Lunes" }))
  const apertura = grupo.getByRole("combobox", { name: "Apertura" })
  const cierre = grupo.getByRole("combobox", { name: "Cierre" })
  expect(apertura.textContent).toBe("09:30")
  expect(cierre.textContent).toBe("12:07")
  apertura.focus()
  fireEvent.keyDown(apertura, { key: "ArrowDown" })
  const opcion = await screen.findByRole("option", { name: "09:45" })
  fireEvent.keyDown(opcion, { key: "Enter" })
  expect(apertura.textContent).toBe("09:45")
  fireEvent.submit(screen.getByRole("form", { name: "Configuración del negocio" }))
  await screen.findByText("Revisá los horarios.")
  const enviado = guardar.mock.lastCall![1] as FormData
  expect(JSON.parse(String(enviado.get("horarios"))).lunes).toEqual([{ apertura: "09:45", cierre: "12:07" }])
  expect(apertura.textContent).toBe("09:45")
  fireEvent.keyDown(cierre, { key: "ArrowDown" })
  expect(await screen.findByRole("option", { name: "12:07" })).toBeTruthy()
})

it("limita a dos franjas por día y bloquea un solapamiento antes de guardar", async () => {
  const horarios = {
    ...configuracionPrueba.horarios,
    lunes: [{ apertura: "09:30", cierre: "12:15" }, { apertura: "10:00", cierre: "13:00" }],
  }
  render(<FormularioConfiguracionNegocio inicial={{ ...configuracionPrueba, horarios }} />)
  const form = screen.getByRole("form", { name: "Configuración del negocio" })
  fireEvent.submit(form)
  expect(await screen.findByText(/no pueden superponerse/i)).toBeTruthy()
  expect(guardar).not.toHaveBeenCalled()
  expect(screen.queryByRole("button", { name: "+ Agregar otra franja" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Quitar segunda franja" }))
  expect(screen.queryByText(/no pueden superponerse/i)).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "+ Agregar otra franja" }))
  expect(screen.getAllByRole("combobox")).toHaveLength(4)
  expect(screen.queryByRole("button", { name: "+ Agregar otra franja" })).toBeNull()
})
