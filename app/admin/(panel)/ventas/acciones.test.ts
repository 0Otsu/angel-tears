import { beforeEach, describe, expect, it, vi } from "vitest"
import { anularVentaAccion, consultarDetalleVentaAccion, registrarVentaAccion } from "./acciones"

const { registrar, anular, detalle, revalidar } = vi.hoisted(() => ({
  registrar: vi.fn(), anular: vi.fn(), detalle: vi.fn(), revalidar: vi.fn(),
}))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "sesion-del-guard" }) }))
vi.mock("next/cache", () => ({ revalidatePath: revalidar }))
vi.mock("@/lib/modulos/ventas/administracion-aplicacion", () => ({
  obtenerAdministracionVentas: () => ({ registrar, anular, detalle }),
}))

const SUPERFICIES = [["/admin/ventas"], ["/admin/stock"], ["/admin"], ["/"], ["/catalogo"], ["/catalogo/[slug]", "page"]]

beforeEach(() => { registrar.mockReset(); anular.mockReset(); detalle.mockReset(); revalidar.mockReset() })

describe("Server Actions de Ventas", () => {
  it("pasa los encabezados al caso de uso y refresca stock, Home, catalogo y PDP solo tras confirmar", async () => {
    registrar.mockResolvedValue({ estado: "ok", repetido: false, venta: { id: "v1" } })

    const resultado = await registrarVentaAccion({ lineas: [] })

    expect(resultado).toMatchObject({ estado: "ok" })
    expect(registrar.mock.calls[0][0].get("cookie")).toBe("sesion-del-guard")
    expect(revalidar.mock.calls).toEqual(SUPERFICIES)
  })

  it("un reintento ya confirmado no cambia ningun saldo y no refresca", async () => {
    registrar.mockResolvedValue({ estado: "ok", repetido: true, venta: { id: "v1" } })

    await registrarVentaAccion({})

    expect(revalidar).not.toHaveBeenCalled()
  })

  it.each([
    ["stock_insuficiente"], ["datos_invalidos"], ["conflicto_solicitud"], ["sesion_requerida"],
  ])("un registro rechazado (%s) no refresca nada", async (estado) => {
    registrar.mockResolvedValue({ estado })

    expect(await registrarVentaAccion({})).toEqual({ estado })
    expect(revalidar).not.toHaveBeenCalled()
  })

  it("anular refresca solo cuando anula de verdad", async () => {
    anular.mockResolvedValueOnce({ estado: "ok", venta: { id: "v1" } })
    await anularVentaAccion("v1")
    expect(revalidar.mock.calls).toEqual(SUPERFICIES)

    revalidar.mockReset()
    anular.mockResolvedValueOnce({ estado: "ya_anulada", venta: { id: "v1" } })
    await anularVentaAccion("v1")
    anular.mockResolvedValueOnce({ estado: "no_encontrada" })
    await anularVentaAccion("x")
    expect(revalidar).not.toHaveBeenCalled()
  })

  it("consultar el detalle no refresca nada", async () => {
    detalle.mockResolvedValue({ estado: "ok", venta: { id: "v1" } })

    await consultarDetalleVentaAccion("v1")

    expect(detalle.mock.calls[0][1]).toBe("v1")
    expect(revalidar).not.toHaveBeenCalled()
  })

  it("un fallo tecnico no filtra SQL, payload o stack, no refresca y permite reintentar", async () => {
    registrar.mockRejectedValue(new Error("SQL secreto con datos internos"))
    anular.mockRejectedValue(new Error("SQL secreto con datos internos"))
    detalle.mockRejectedValue(new Error("SQL secreto con datos internos"))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      expect(await registrarVentaAccion({})).toEqual({ estado: "error_tecnico" })
      expect(await anularVentaAccion("v1")).toEqual({ estado: "error_tecnico" })
      expect(await consultarDetalleVentaAccion("v1")).toEqual({ estado: "error_tecnico" })
      expect(JSON.stringify(log.mock.calls)).not.toContain("SQL secreto")
      expect(revalidar).not.toHaveBeenCalled()
    } finally { log.mockRestore() }
  })
})
