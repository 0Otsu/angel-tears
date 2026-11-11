import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProductoParaComprar, ProveedorParaComprar } from "@/lib/modulos/compras/administracion-contrato"
import type { CompraDetalle, ResumenCompra } from "@/lib/modulos/compras/contrato"
import { ComprasAdmin } from "./compras-admin"

const { registrar, anular, detalle, refresh } = vi.hoisted(() => ({ registrar: vi.fn(), anular: vi.fn(), detalle: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("@/app/admin/(panel)/compras/acciones", () => ({
  registrarCompraAccion: registrar, anularCompraAccion: anular, consultarDetalleCompraAccion: detalle,
}))

const productos: ProductoParaComprar[] = [
  { productoId: "11111111-1111-4111-8111-111111111111", nombre: "Anillo", categoriaNombre: "Anillos", saldo: 3 },
  { productoId: "22222222-2222-4222-8222-222222222222", nombre: "Collar", categoriaNombre: "Collares", saldo: 0 },
]
const proveedores: ProveedorParaComprar[] = [{ id: "33333333-3333-4333-8333-333333333333", nombre: "Mayorista Sol" }]
const resumen = (datos: Partial<ResumenCompra> & Pick<ResumenCompra, "id">): ResumenCompra => ({
  fechaOperacion: "2026-11-03", nombreProveedor: null, total: "502.50", estado: "CONFIRMADA", cantidadLineas: 1, creadoEn: "2026-11-03T15:00:00.000Z", ...datos,
})
const compras = [
  resumen({ id: "c1", nombreProveedor: "Mayorista Sol" }),
  resumen({ id: "c2", estado: "ANULADA", total: "10.00", fechaOperacion: "2026-10-01" }),
]
const detalleDe = (r: ResumenCompra, estado: CompraDetalle["estado"] = r.estado): CompraDetalle => ({
  id: r.id, fechaOperacion: r.fechaOperacion, proveedorId: null, nombreProveedor: r.nombreProveedor, nota: "Pedido de noviembre", total: r.total, estado,
  creadoEn: r.creadoEn, anuladoEn: estado === "ANULADA" ? "2026-11-04T10:00:00.000Z" : null,
  lineas: [{ numeroLinea: 1, productoId: productos[0].productoId, nombreProducto: "Anillo", cantidad: 5, costoUnitario: "100.50", subtotal: "502.50" }],
})
const filtros = { estado: "", desde: "", hasta: "" }
const mostrar = (extra: Partial<Parameters<typeof ComprasAdmin>[0]> = {}) =>
  render(<ComprasAdmin compras={compras} hayMas={false} productos={productos} proveedores={proveedores} filtros={filtros} {...extra} />)

beforeEach(() => { registrar.mockReset(); anular.mockReset(); detalle.mockReset(); refresh.mockReset() })

describe("listado", () => {
  it("muestra fecha, proveedor (o sin proveedor), total y estado, y las anuladas tachadas", () => {
    mostrar()
    const filas = within(screen.getByRole("table", { name: "Compras" })).getAllByRole("row").slice(1)
    expect(filas).toHaveLength(2)
    expect(within(filas[0]).getByText("Mayorista Sol")).toBeTruthy()
    expect(within(filas[0]).getByText("Confirmada")).toBeTruthy()
    expect(within(filas[1]).getByText("Sin proveedor")).toBeTruthy()
    expect(within(filas[1]).getByText("Anulada")).toBeTruthy()
  })

  it("estado vacio sin filtros y con filtros", () => {
    const { unmount } = mostrar({ compras: [] })
    expect(screen.getByText("Todavía no registraste compras")).toBeTruthy()
    unmount()
    mostrar({ compras: [], filtros: { estado: "ANULADA", desde: "", hasta: "" } })
    expect(screen.getByText("No hay compras con estos filtros")).toBeTruthy()
    expect(screen.getAllByRole("link", { name: "Limpiar filtros" }).length).toBeGreaterThan(0)
  })

  it("error de carga con reintento y sin boton de registro", () => {
    mostrar({ errorCarga: true })
    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar las compras")
    expect(screen.getByRole("link", { name: "Reintentar consulta" }).getAttribute("href")).toBe("/admin/compras")
    expect(screen.queryByRole("button", { name: "Registrar compra" })).toBeNull()
  })

  it("errores de filtro por campo", () => {
    mostrar({ compras: [], erroresFiltro: { hasta: "La fecha final no puede ser anterior a la inicial." } })
    expect(screen.getByText("La fecha final no puede ser anterior a la inicial.")).toBeTruthy()
    expect(screen.getByText("Revisá los filtros para ver las compras.")).toBeTruthy()
  })

  it("avisa cuando hay mas resultados", () => {
    mostrar({ hayMas: true })
    expect(screen.getByRole("status").textContent).toContain("hay más")
  })
})

describe("registrar compra", () => {
  const abrir = () => { mostrar(); fireEvent.click(screen.getByRole("button", { name: "Registrar compra" })) }
  const enviar = () => fireEvent.submit(screen.getByRole("form", { name: "Registrar compra" }))
  function completar() {
    fireEvent.change(screen.getByLabelText("Producto 1 *"), { target: { value: productos[0].productoId } })
    fireEvent.change(screen.getByLabelText("Cantidad *"), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText("Costo unitario *"), { target: { value: "100,50" } })
  }

  it("estima el total con coma decimal y envia clave, fecha, proveedor, nota y lineas con costo normalizado", async () => {
    registrar.mockResolvedValue({ estado: "ok", repetido: false, compra: detalleDe(compras[0]) })
    abrir(); completar()
    fireEvent.change(screen.getByLabelText("Proveedor (opcional)"), { target: { value: proveedores[0].id } })
    fireEvent.change(screen.getByLabelText("Nota (opcional)"), { target: { value: "Pedido" } })
    expect(screen.getByLabelText("Subtotal del producto 1").textContent).toContain("502,50")
    enviar()
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(registrar).toHaveBeenCalledWith({
      claveSolicitud: expect.stringMatching(/^[0-9a-f-]{36}$/),
      fechaOperacion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      proveedorId: proveedores[0].id,
      nota: "Pedido",
      lineas: [{ productoId: productos[0].productoId, cantidad: "5", costoUnitario: "100.50" }],
    })
    expect(screen.getByText(/Compra registrada por/)).toBeTruthy()
  })

  it("permite agregar y quitar lineas, y no deja quitar la ultima", () => {
    abrir()
    expect((screen.getByRole("button", { name: "Quitar el producto 1" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Agregar producto" }))
    expect(screen.getByLabelText("Producto 2 *")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Quitar el producto 2" }))
    expect(screen.queryByLabelText("Producto 2 *")).toBeNull()
  })

  it("ofrece solo los proveedores recibidos y permite no elegir ninguno", () => {
    abrir()
    const opciones = within(screen.getByLabelText("Proveedor (opcional)")).getAllByRole("option").map((o) => o.textContent)
    expect(opciones).toEqual(["Sin proveedor", "Mayorista Sol"])
  })

  it("muestra errores por campo y por linea, enfoca el primero y conserva lo escrito", async () => {
    registrar.mockResolvedValue({ estado: "datos_invalidos", errores: { porLinea: [{ linea: 0, costoUnitario: "Ingresá un costo válido, con hasta dos decimales." }] } })
    abrir(); completar()
    fireEvent.change(screen.getByLabelText("Costo unitario *"), { target: { value: "10,505" } })
    enviar()
    await screen.findByText("Ingresá un costo válido, con hasta dos decimales.")
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Costo unitario *")))
    expect((screen.getByLabelText("Cantidad *") as HTMLInputElement).value).toBe("5")
    expect(refresh).not.toHaveBeenCalled()
  })

  it("tras un error tecnico conserva los datos y reintenta con la misma clave", async () => {
    registrar.mockResolvedValueOnce({ estado: "error_tecnico" }).mockResolvedValueOnce({ estado: "ok", repetido: true, compra: detalleDe(compras[0]) })
    abrir(); completar()
    enviar()
    await screen.findByText(/Conservamos tus datos/)
    enviar()
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(registrar.mock.calls[1][0].claveSolicitud).toBe(registrar.mock.calls[0][0].claveSolicitud)
    expect(screen.getByText("Esa compra ya estaba registrada.")).toBeTruthy()
  })

  it("tras un rechazo del servidor usa una clave nueva para el siguiente envio", async () => {
    registrar.mockResolvedValueOnce({ estado: "proveedor_inactivo" }).mockResolvedValueOnce({ estado: "ok", repetido: false, compra: detalleDe(compras[0]) })
    abrir(); completar()
    enviar()
    expect((await screen.findByRole("alert")).textContent).toContain("proveedor está inactivo")
    enviar()
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(registrar.mock.calls[1][0].claveSolicitud).not.toBe(registrar.mock.calls[0][0].claveSolicitud)
  })

  it("ofrece volver a iniciar sesion cuando la sesion vencio", async () => {
    registrar.mockResolvedValue({ estado: "sesion_requerida" })
    abrir(); completar()
    enviar()
    await screen.findByRole("link", { name: "Iniciar sesión" })
  })

  it("no permite registrar si no hay productos", () => {
    mostrar({ productos: [] })
    expect((screen.getByRole("button", { name: "Registrar compra" }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("detalle y anulacion", () => {
  async function abrirDetalle(r = compras[0]) {
    detalle.mockResolvedValue({ estado: "ok", compra: detalleDe(r) })
    mostrar()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle de la compra/ })[r.id === "c1" ? 0 : 1])
    await screen.findByRole("table", { name: "Productos de la compra" })
  }

  it("muestra lineas con costo historico, total, nota y la aclaracion de no edicion", async () => {
    await abrirDetalle()
    expect(detalle).toHaveBeenCalledWith("c1")
    expect(screen.getByText("Pedido de noviembre")).toBeTruthy()
    expect(screen.getByText(/anulá la compra y registrá otra/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: /editar|modificar/i })).toBeNull()
  })

  it("anula con confirmacion previa y refresca", async () => {
    anular.mockResolvedValue({ estado: "ok", compra: detalleDe(compras[0], "ANULADA") })
    await abrirDetalle()
    fireEvent.click(screen.getByRole("button", { name: "Anular compra" }))
    expect(anular).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Sí, anular compra" }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(anular).toHaveBeenCalledWith("c1")
    expect(screen.getByText("Compra anulada. El stock se revirtió.")).toBeTruthy()
  })

  it("si la reversion dejaria stock negativo, explica que no se anulo nada y lista los productos", async () => {
    anular.mockResolvedValue({ estado: "reversion_bloqueada", faltantes: [{ productoId: "p", nombreProducto: "Anillo", disponible: 2, requerido: 5 }] })
    await abrirDetalle()
    fireEvent.click(screen.getByRole("button", { name: "Anular compra" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, anular compra" }))
    const alerta = await screen.findByRole("alert")
    expect(alerta.textContent).toContain("No se hizo ningún cambio")
    expect(alerta.textContent).toContain("Anillo: hay 2 y habría que restar 5.")
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Anular compra" })).toBeTruthy()
  })

  it("una compra anulada no ofrece anular de nuevo", async () => {
    await abrirDetalle(compras[1])
    expect(screen.queryByRole("button", { name: "Anular compra" })).toBeNull()
  })

  it("muestra el error de consulta y la sesion vencida", async () => {
    detalle.mockResolvedValue({ estado: "sesion_requerida" })
    mostrar()
    fireEvent.click(screen.getAllByRole("button", { name: /Ver detalle de la compra/ })[0])
    await screen.findByRole("link", { name: "Iniciar sesión" })
  })
})
