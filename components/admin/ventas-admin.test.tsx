import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProductoParaVender } from "@/lib/modulos/ventas/administracion-contrato"
import type { ResumenVenta, VentaDetalle } from "@/lib/modulos/ventas/contrato"
import { VentasAdmin, type FiltrosVentas } from "./ventas-admin"

const { registrar, anular, detalle, refresh } = vi.hoisted(() => ({ registrar: vi.fn(), anular: vi.fn(), detalle: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("@/app/admin/(panel)/ventas/acciones", () => ({
  registrarVentaAccion: registrar, anularVentaAccion: anular, consultarDetalleVentaAccion: detalle,
}))

const productos: ProductoParaVender[] = [
  { productoId: "p1", nombre: "Anillo", categoriaNombre: "Anillos", precio: "10.10", saldo: 5 },
  { productoId: "p2", nombre: "Pulsera", categoriaNombre: "Pulseras", precio: "0.10", saldo: 2 },
  { productoId: "p3", nombre: "Collar", categoriaNombre: "Collares", precio: "50.00", saldo: 0 },
]
const sinFiltros: FiltrosVentas = { estado: "", desde: "", hasta: "" }
const resumen = (datos: Partial<ResumenVenta> & Pick<ResumenVenta, "id">): ResumenVenta => ({
  fechaOperacion: "2026-11-05", comprador: null, total: "20.20", estado: "CONFIRMADA", cantidadLineas: 1, creadoEn: "2026-11-05T12:00:00.000Z", ...datos,
})
const ventaDetalle = (datos: Partial<VentaDetalle> = {}): VentaDetalle => ({
  id: "v1", fechaOperacion: "2026-11-05", comprador: null, total: "20.20", estado: "CONFIRMADA",
  creadoEn: "2026-11-05T12:00:00.000Z", anuladoEn: null,
  lineas: [{ numeroLinea: 1, productoId: "p1", nombreProducto: "Anillo", cantidad: 2, precioUnitario: "10.10", subtotal: "20.20" }],
  ...datos,
})

beforeEach(() => { registrar.mockReset(); anular.mockReset(); detalle.mockReset(); refresh.mockReset() })

describe("listado de ventas", () => {
  it("muestra fecha, Consumidor Final, total y estado, con la anulada diferenciada", () => {
    render(<VentasAdmin productos={productos} filtros={sinFiltros} hayMas={false} ventas={[
      resumen({ id: "v1" }),
      resumen({ id: "v2", comprador: "Ana Pérez", estado: "ANULADA", total: "5.00", cantidadLineas: 2 }),
    ]} />)

    const tabla = screen.getByRole("table", { name: "Ventas" })
    expect(within(tabla).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Fecha", "Comprador", "Productos", "Total", "Estado", "Acciones"])
    const [primera, segunda] = within(tabla).getAllByRole("row").slice(1)
    expect(primera.textContent).toContain("05/11/2026")
    expect(primera.textContent).toContain("Consumidor Final")
    expect(primera.textContent).toContain("Confirmada")
    expect(segunda.textContent).toContain("Ana Pérez")
    expect(segunda.textContent).toContain("Anulada")
    expect(screen.getByRole("status").textContent).toBe("2 ventas")
  })

  it("avisa cuando hay mas resultados que los mostrados", () => {
    render(<VentasAdmin productos={productos} filtros={sinFiltros} hayMas ventas={[resumen({ id: "v1" })]} />)

    expect(screen.getByRole("status").textContent).toContain("hay más")
  })

  it("distingue el estado vacio, el vacio con filtros y el error de carga", () => {
    const { unmount } = render(<VentasAdmin productos={productos} filtros={sinFiltros} hayMas={false} ventas={[]} />)
    expect(screen.getByText("Todavía no registraste ventas")).toBeTruthy()
    unmount()

    const filtrado = render(<VentasAdmin productos={productos} filtros={{ ...sinFiltros, estado: "ANULADA" }} hayMas={false} ventas={[]} />)
    expect(screen.getByText("No hay ventas con estos filtros")).toBeTruthy()
    expect(screen.getAllByRole("link", { name: "Limpiar filtros" })[0].getAttribute("href")).toBe("/admin/ventas")
    filtrado.unmount()

    render(<VentasAdmin productos={productos} filtros={sinFiltros} hayMas={false} ventas={[]} errorCarga />)
    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar las ventas")
    expect(screen.getByRole("link", { name: "Reintentar consulta" }).getAttribute("href")).toBe("/admin/ventas")
    expect(screen.queryByRole("button", { name: "Registrar venta" })).toBeNull()
  })

  it("el filtro automatico conserva valores y muestra errores accesibles sin boton Filtrar", () => {
    render(<VentasAdmin productos={productos} hayMas={false} ventas={[]} filtros={{ estado: "ANULADA", desde: "2026-11-01", hasta: "ayer" }} erroresFiltro={{ hasta: "Ingresá una fecha válida." }} />)

    expect(screen.getByRole("search", { name: "Filtrar operaciones" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Filtrar" })).toBeNull()
    expect((screen.getByLabelText("Estado") as HTMLSelectElement).value).toBe("ANULADA")
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2026-11-01")
    expect(screen.getByLabelText("Hasta").getAttribute("aria-invalid")).toBe("true")
    expect(screen.getByText("Ingresá una fecha válida.")).toBeTruthy()
    expect(screen.getByText("Revisá los filtros para ver las ventas.")).toBeTruthy()
  })
})

describe("registrar venta", () => {
  function abrir() {
    render(<VentasAdmin productos={productos} filtros={sinFiltros} hayMas={false} ventas={[]} />)
    fireEvent.click(screen.getByRole("button", { name: "Registrar venta" }))
    return screen.getByRole("dialog")
  }
  const elegir = (indice: number, productoId: string, cantidad: string) => {
    fireEvent.change(screen.getAllByLabelText(/^Producto \d/)[indice], { target: { value: productoId } })
    fireEvent.change(screen.getAllByLabelText("Cantidad *")[indice], { target: { value: cantidad } })
  }
  const confirmar = () => fireEvent.click(screen.getByRole("button", { name: "Confirmar venta" }))

  it("no permite abrir el registro sin productos", () => {
    render(<VentasAdmin productos={[]} filtros={sinFiltros} hayMas={false} ventas={[]} />)

    expect((screen.getByRole("button", { name: "Registrar venta" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("propone la fecha de hoy, una linea y ofrece solo productos con stock", () => {
    abrir()

    expect((screen.getByLabelText("Fecha de la venta *") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(screen.getAllByLabelText(/^Producto \d/)).toHaveLength(1)
    const opciones = within(screen.getByLabelText("Producto 1 *")).getAllByRole("option") as HTMLOptionElement[]
    expect(opciones.find((o) => o.textContent?.includes("Collar"))?.disabled).toBe(true)
    expect(opciones.find((o) => o.textContent?.includes("Anillo"))?.disabled).toBe(false)
    expect(screen.getByText("Si lo dejás vacío se registra como Consumidor Final.")).toBeTruthy()
  })

  it("agrega y quita lineas, y estima subtotales y total exactos", () => {
    abrir()
    elegir(0, "p1", "2")
    fireEvent.click(screen.getByRole("button", { name: "Agregar producto" }))
    elegir(1, "p2", "3")

    expect(screen.getByLabelText("Subtotal del producto 1").textContent).toBe("$20,20")
    expect(screen.getByLabelText("Subtotal del producto 2").textContent).toBe("$0,30")
    expect(within(screen.getByText("Total estimado").parentElement!).getByText("$20,50")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Quitar el producto 2" }))
    expect(screen.getAllByLabelText(/^Producto \d/)).toHaveLength(1)
    expect((screen.getByRole("button", { name: "Quitar el producto 1" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("envia el contenido del formulario y, si se guarda, cierra, avisa y refresca", async () => {
    registrar.mockResolvedValue({ estado: "ok", repetido: false, venta: ventaDetalle() })
    abrir()
    fireEvent.change(screen.getByLabelText("Comprador (opcional)"), { target: { value: "Ana" } })
    elegir(0, "p1", "2")
    confirmar()

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(registrar).toHaveBeenCalledTimes(1)
    expect(registrar.mock.calls[0][0]).toMatchObject({
      comprador: "Ana", lineas: [{ productoId: "p1", cantidad: "2" }],
    })
    expect(registrar.mock.calls[0][0].claveSolicitud).toMatch(/^[0-9a-f-]{36}$/)
    expect(screen.getByRole("status", { name: "" }).textContent).toContain("Venta registrada por $20,20")
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("con stock insuficiente informa el disponible, conserva lo ingresado y usa otra clave al reenviar", async () => {
    registrar.mockResolvedValue({ estado: "stock_insuficiente", productoId: "p2", disponible: 2, requerido: 9 })
    abrir()
    elegir(0, "p2", "9")
    confirmar()

    const alerta = await screen.findByText(/No alcanza el stock de Pulsera: hay 2 y la venta pide 9/)
    expect(alerta.closest("[role='alert']")).toBeTruthy()
    expect((screen.getByLabelText("Cantidad *") as HTMLInputElement).value).toBe("9")
    expect((screen.getByLabelText("Producto 1 *") as HTMLSelectElement).value).toBe("p2")
    expect(refresh).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Cantidad *"), { target: { value: "2" } })
    confirmar()
    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(2))
    expect(registrar.mock.calls[1][0].claveSolicitud).not.toBe(registrar.mock.calls[0][0].claveSolicitud)
  })

  it("ante un fallo tecnico conserva los datos y reintenta con la misma clave", async () => {
    registrar.mockResolvedValue({ estado: "error_tecnico" })
    abrir()
    elegir(0, "p1", "1")
    confirmar()
    await screen.findByText(/No pudimos registrar la venta/)

    confirmar()
    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(2))
    expect(registrar.mock.calls[1][0].claveSolicitud).toBe(registrar.mock.calls[0][0].claveSolicitud)
    expect((screen.getByLabelText("Cantidad *") as HTMLInputElement).value).toBe("1")
  })

  it("marca los campos invalidos de cada linea, los describe y lleva el foco al primero", async () => {
    registrar.mockResolvedValue({
      estado: "datos_invalidos",
      errores: { porLinea: [{ linea: 0, productoId: "Elegí un producto.", cantidad: "Ingresá una cantidad entera mayor a cero." }] },
    })
    abrir()
    confirmar()

    const producto = await screen.findByLabelText("Producto 1 *")
    await waitFor(() => expect(document.activeElement).toBe(producto))
    expect(producto.getAttribute("aria-invalid")).toBe("true")
    expect(producto.getAttribute("aria-describedby")).toBeTruthy()
    expect(document.getElementById(producto.getAttribute("aria-describedby")!)?.textContent).toBe("Elegí un producto.")
    expect(screen.getByLabelText("Cantidad *").getAttribute("aria-invalid")).toBe("true")
  })

  it("sin sesion lo dice y ofrece iniciar sesion", async () => {
    registrar.mockResolvedValue({ estado: "sesion_requerida" })
    abrir()
    elegir(0, "p1", "1")
    confirmar()

    await screen.findByText("Tu sesión venció. Volvé a iniciar sesión.")
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/admin/login")
  })
})

describe("detalle y anulacion", () => {
  function abrirDetalle(estado: ResumenVenta["estado"] = "CONFIRMADA") {
    render(<VentasAdmin productos={productos} filtros={sinFiltros} hayMas={false} ventas={[resumen({ id: "v1", estado })]} />)
    fireEvent.click(screen.getByRole("button", { name: /Ver detalle de la venta del 05\/11\/2026/ }))
  }

  it("carga el detalle con las lineas historicas y el total", async () => {
    detalle.mockResolvedValue({ estado: "ok", venta: ventaDetalle() })
    abrirDetalle()

    const tabla = await screen.findByRole("table", { name: "Productos de la venta" })
    expect(detalle).toHaveBeenCalledWith("v1")
    expect(within(tabla).getByText("Anillo")).toBeTruthy()
    expect(within(tabla).getAllByText("$20,20").length).toBeGreaterThan(0)
    expect(screen.getByText(/no se editan/)).toBeTruthy()
  })

  it("informa un error al consultar el detalle", async () => {
    detalle.mockResolvedValue({ estado: "error_tecnico" })
    abrirDetalle()

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos consultar la venta")
  })

  it("pide confirmacion antes de anular y no anula si se vuelve atras", async () => {
    detalle.mockResolvedValue({ estado: "ok", venta: ventaDetalle() })
    abrirDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Anular venta" }))

    expect(screen.getByText("¿Anular esta venta?")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "No, volver" }))
    expect(anular).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Anular venta" })).toBeTruthy()
  })

  it("anula al confirmar, avisa y refresca", async () => {
    detalle.mockResolvedValue({ estado: "ok", venta: ventaDetalle() })
    anular.mockResolvedValue({ estado: "ok", venta: ventaDetalle({ estado: "ANULADA" }) })
    abrirDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Anular venta" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, anular venta" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(anular).toHaveBeenCalledWith("v1")
    expect(screen.getByText("Venta anulada. Las unidades volvieron al stock.")).toBeTruthy()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("si la anulacion falla no cambia nada y deja reintentar", async () => {
    detalle.mockResolvedValue({ estado: "ok", venta: ventaDetalle() })
    anular.mockResolvedValue({ estado: "error_tecnico" })
    abrirDetalle()
    fireEvent.click(await screen.findByRole("button", { name: "Anular venta" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, anular venta" }))

    expect((await screen.findByRole("alert")).textContent).toContain("No se hizo ningún cambio")
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Sí, anular venta" })).toBeTruthy()
  })

  it("una venta ya anulada no ofrece anular y muestra su estado", async () => {
    detalle.mockResolvedValue({ estado: "ok", venta: ventaDetalle({ estado: "ANULADA", anuladoEn: "2026-11-06T12:00:00.000Z" }) })
    abrirDetalle("ANULADA")

    await screen.findByRole("table", { name: "Productos de la venta" })
    expect(screen.queryByRole("button", { name: "Anular venta" })).toBeNull()
    expect(within(screen.getByRole("dialog")).getByText("Anulada")).toBeTruthy()
  })
})
