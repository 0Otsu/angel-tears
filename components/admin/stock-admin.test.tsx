import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FilaStock } from "@/lib/modulos/inventario/administracion-contrato"
import { StockAdmin } from "./stock-admin"

const { ajustar, minimo, historial, refresh } = vi.hoisted(() => ({ ajustar: vi.fn(), minimo: vi.fn(), historial: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("@/app/admin/(panel)/stock/acciones", () => ({ ajustarStockAccion: ajustar, cambiarMinimoAccion: minimo, consultarHistorialAccion: historial }))

const fila = (datos: Partial<FilaStock> & Pick<FilaStock, "productoId" | "nombre">): FilaStock => ({
  categoriaNombre: "Collares", publicado: false, saldo: 10, minimo: null, stockBajo: false, sinStock: false, ...datos,
})
const filas = [
  fila({ productoId: "p1", nombre: "Anillo", saldo: 10 }),
  fila({ productoId: "p2", nombre: "Brazalete", saldo: 3, minimo: 5, stockBajo: true }),
  fila({ productoId: "p3", nombre: "Collar", saldo: 0, minimo: 0, stockBajo: true, sinStock: true }),
]

beforeEach(() => { ajustar.mockReset(); minimo.mockReset(); historial.mockReset(); refresh.mockReset() })

describe("listado", () => {
  it("muestra saldo, minimo y estados desde los datos recibidos", () => {
    render(<StockAdmin filas={filas} />)
    const items = within(screen.getByRole("list", { name: "Inventario por producto" })).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText("Sin mínimo")).toBeTruthy()
    expect(within(items[1]).getByText("Stock bajo")).toBeTruthy()
    expect(within(items[2]).getByText("Sin stock")).toBeTruthy()
    expect(within(items[0]).queryByText("Stock bajo")).toBeNull()
  })

  it("filtra por nombre y por estado, e informa cuando no hay coincidencias", () => {
    render(<StockAdmin filas={filas} />)
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "bajo" } })
    expect(screen.getByRole("status").textContent).toBe("2 productos")
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "sin_stock" } })
    expect(screen.getByRole("status").textContent).toBe("1 producto")
    fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "zzz" } })
    expect(screen.getByText("No hay productos que coincidan con estos filtros.")).toBeTruthy()
  })

  it("muestra estado vacio y error de carga con reintento", () => {
    const { unmount } = render(<StockAdmin filas={[]} />)
    expect(screen.getByText("Todavía no hay productos con inventario")).toBeTruthy()
    unmount()
    render(<StockAdmin filas={[]} errorCarga />)
    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar el inventario")
    expect(screen.getByRole("link", { name: "Reintentar consulta" }).getAttribute("href")).toBe("/admin/stock")
  })
})

describe("ajustar stock", () => {
  function abrir() {
    render(<StockAdmin filas={filas} />)
    fireEvent.click(screen.getByRole("button", { name: "Ajustar stock de Anillo" }))
    return screen.getByRole("dialog")
  }
  const completar = (cantidad: string, motivo: string) => {
    fireEvent.change(screen.getByLabelText("Cantidad *"), { target: { value: cantidad } })
    fireEvent.change(screen.getByLabelText("Motivo *"), { target: { value: motivo } })
  }

  it("envia producto, tipo, cantidad, motivo y una clave de solicitud, y refresca", async () => {
    ajustar.mockResolvedValue({ estado: "ok", saldoResultante: 15, repetido: false })
    abrir(); completar("5", "Recuento")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(ajustar).toHaveBeenCalledWith({ productoId: "p1", tipo: "INCREMENTO", cantidad: "5", motivo: "Recuento", claveSolicitud: expect.stringMatching(/^[0-9a-f-]{36}$/) })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText(/Stock de Anillo: 15/)).toBeTruthy()
  })

  it("muestra errores por campo, enfoca el primero y conserva lo escrito", async () => {
    ajustar.mockResolvedValue({ estado: "datos_invalidos", errores: { cantidad: "Ingresá una cantidad entera mayor a cero." } })
    abrir(); completar("0", "Recuento")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await screen.findByText("Ingresá una cantidad entera mayor a cero.")
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Cantidad *")))
    expect((screen.getByLabelText("Motivo *") as HTMLTextAreaElement).value).toBe("Recuento")
    expect(refresh).not.toHaveBeenCalled()
  })

  it("informa stock insuficiente con el disponible", async () => {
    ajustar.mockResolvedValue({ estado: "stock_insuficiente", disponible: 2, requerido: 5 })
    abrir(); completar("5", "Rotura")
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "DECREMENTO" } })
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    expect((await screen.findByRole("alert")).textContent).toContain("hay 2 y querés restar 5")
  })

  it("tras un error tecnico conserva los datos y reintenta con la misma clave", async () => {
    ajustar.mockResolvedValueOnce({ estado: "error_tecnico" }).mockResolvedValueOnce({ estado: "ok", saldoResultante: 15, repetido: true })
    abrir(); completar("5", "Recuento")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await screen.findByText(/Conservamos tus datos/)
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(ajustar.mock.calls[1][0].claveSolicitud).toBe(ajustar.mock.calls[0][0].claveSolicitud)
  })

  it("ofrece volver a iniciar sesion cuando la sesion vencio", async () => {
    ajustar.mockResolvedValue({ estado: "sesion_requerida" })
    abrir(); completar("5", "Recuento")
    fireEvent.submit(screen.getByRole("form", { name: "Ajustar stock" }))
    await screen.findByRole("link", { name: "Iniciar sesión" })
  })
})

describe("minimo", () => {
  function abrir(nombre = "Brazalete") {
    render(<StockAdmin filas={filas} />)
    fireEvent.click(screen.getByRole("button", { name: `Configurar mínimo de ${nombre}` }))
  }

  it("precarga el minimo actual y permite quitarlo dejando el campo vacio", async () => {
    minimo.mockResolvedValue({ estado: "ok", minimo: null })
    abrir()
    const campo = screen.getByLabelText("Mínimo") as HTMLInputElement
    expect(campo.value).toBe("5")
    fireEvent.change(campo, { target: { value: "" } })
    fireEvent.submit(screen.getByRole("form", { name: "Mínimo de stock" }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(minimo).toHaveBeenCalledWith({ productoId: "p2", minimo: "" })
  })

  it("muestra el error de validacion del servidor", async () => {
    minimo.mockResolvedValue({ estado: "datos_invalidos", errores: { minimo: "Ingresá un entero de cero o más." } })
    abrir()
    fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "-1" } })
    fireEvent.submit(screen.getByRole("form", { name: "Mínimo de stock" }))
    await screen.findByText("Ingresá un entero de cero o más.")
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe("historial", () => {
  it("carga y muestra los movimientos con motivo, actor y saldo", async () => {
    historial.mockResolvedValue({ estado: "ok", movimientos: [{ id: "m1", delta: -2, saldoResultante: 8, tipo: "ORIGINAL", tipoAjuste: "DECREMENTO", motivo: "Rotura", actor: "Ana", creadoEn: "2026-11-02T15:00:00.000Z" }] })
    render(<StockAdmin filas={filas} />)
    fireEvent.click(screen.getByRole("button", { name: "Ver historial de Anillo" }))
    expect(await screen.findByText("Rotura")).toBeTruthy()
    expect(historial).toHaveBeenCalledWith("p1")
    expect(screen.getByText(/Stock resultante: 8 · Ana/)).toBeTruthy()
  })

  it("muestra vacio y permite reintentar tras un error", async () => {
    historial.mockResolvedValueOnce({ estado: "error_tecnico" }).mockResolvedValueOnce({ estado: "ok", movimientos: [] })
    render(<StockAdmin filas={filas} />)
    fireEvent.click(screen.getByRole("button", { name: "Ver historial de Anillo" }))
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }))
    expect(await screen.findByText("Este producto todavía no tiene movimientos.")).toBeTruthy()
  })
})
