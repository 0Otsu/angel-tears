import { beforeEach, expect, it, vi } from "vitest"

const { guardia, consultar, disponibilidad, db, registrarError } = vi.hoisted(() => ({ guardia: vi.fn(), consultar: vi.fn(), disponibilidad: vi.fn(), db: {}, registrarError: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/components/admin/productos-admin", () => ({ ProductosAdmin: () => null }))
vi.mock("@/lib/modulos/autenticacion/guardia-admin", () => ({ exigirAdministradoraEnPagina: guardia }))
vi.mock("@/lib/modulos/productos/administracion-aplicacion", () => ({ obtenerAdministracionProductos: () => ({ consultar }) }))
vi.mock("@/lib/infraestructura/db", () => ({ obtenerDb: () => db }))
vi.mock("@/lib/modulos/inventario/persistencia", () => ({ crearContratoInventario: () => ({ consultarDisponibilidad: disponibilidad }) }))
import PaginaProductos from "./page"

beforeEach(() => {
  vi.clearAllMocks()
  guardia.mockResolvedValue(undefined)
  consultar.mockResolvedValue({ productos: [{ id: "uno" }, { id: "dos" }], categorias: [] })
  disponibilidad.mockResolvedValue([{ productoId: "uno", hayStock: false, saldo: 0 }, { productoId: "dos", hayStock: true, saldo: 8 }])
  vi.spyOn(console, "error").mockImplementation(registrarError)
})

it("autoriza antes de consultar y reutiliza una unica lectura agrupada, exponiendo solo disponibilidad", async () => {
  const pagina = await PaginaProductos({ searchParams: Promise.resolve({}) })
  expect(guardia.mock.invocationCallOrder[0]).toBeLessThan(consultar.mock.invocationCallOrder[0])
  expect(consultar.mock.invocationCallOrder[0]).toBeLessThan(disponibilidad.mock.invocationCallOrder[0])
  expect(disponibilidad).toHaveBeenCalledExactlyOnceWith(["uno", "dos"])
  expect(pagina.props.disponibilidad).toEqual({ uno: false, dos: true })
})

it("sin autorizacion no consulta productos ni inventario", async () => {
  guardia.mockRejectedValueOnce(new Error("Sesion requerida"))
  await expect(PaginaProductos({ searchParams: Promise.resolve({}) })).rejects.toThrow("Sesion requerida")
  expect(consultar).not.toHaveBeenCalled()
  expect(disponibilidad).not.toHaveBeenCalled()
})

it("si falla inventario conserva productos y disponibilidad desconocida, nunca saldo cero inventado", async () => {
  disponibilidad.mockRejectedValueOnce(new Error("detalle privado"))
  const pagina = await PaginaProductos({ searchParams: Promise.resolve({}) })
  expect(pagina.props.consulta.productos).toHaveLength(2)
  expect(pagina.props.errorCarga).toBe(false)
  expect(pagina.props.disponibilidad).toEqual({})
  expect(registrarError).toHaveBeenCalledWith("[productos] disponibilidad no consultada", { tipo: "Error" })
})

it("sin productos no consulta inventario", async () => {
  consultar.mockResolvedValueOnce({ productos: [], categorias: [] })
  await PaginaProductos({ searchParams: Promise.resolve({}) })
  expect(disponibilidad).not.toHaveBeenCalled()
})

it("error de productos conserva el estado de error y no consulta saldos", async () => {
  consultar.mockRejectedValueOnce(new Error("lectura fallida"))
  const pagina = await PaginaProductos({ searchParams: Promise.resolve({}) })
  expect(pagina.props.errorCarga).toBe(true)
  expect(disponibilidad).not.toHaveBeenCalled()
})
