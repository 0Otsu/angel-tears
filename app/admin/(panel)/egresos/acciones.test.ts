import { afterEach, beforeEach, expect, it, vi } from "vitest"
const { registrar, anular, detalle, revalidar, encabezados } = vi.hoisted(() => ({ registrar: vi.fn(), anular: vi.fn(), detalle: vi.fn(), revalidar: vi.fn(), encabezados: new Headers() }))
vi.mock("next/headers", () => ({ headers: async () => encabezados }))
vi.mock("next/cache", () => ({ revalidatePath: revalidar }))
vi.mock("@/lib/modulos/egresos/administracion-aplicacion", () => ({ obtenerAdministracionEgresos: () => ({ registrar, anular, detalle }) }))
import { registrarEgresoAccion, anularEgresoAccion, detalleEgresoAccion } from "./acciones"
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())
it("delega entradas y encabezados, refresca solo despues de commit", async () => {
  registrar.mockResolvedValue({ estado: "ok", egreso: { id: "id" }, repetido: false })
  const entrada = { concepto: "Luz" }
  await registrarEgresoAccion(entrada)
  expect(registrar).toHaveBeenCalledWith(encabezados, entrada)
  expect(revalidar).toHaveBeenCalledExactlyOnceWith("/admin/egresos")
  revalidar.mockClear()
  registrar.mockResolvedValue({ estado: "sesion_requerida" })
  await registrarEgresoAccion(entrada)
  expect(revalidar).not.toHaveBeenCalled()
})
it("anulacion repetida refresca estado actual sin reejecutar una operacion propia", async () => {
  anular.mockResolvedValue({ estado: "ya_anulado", egreso: { id: "id" } })
  await anularEgresoAccion("id")
  expect(anular).toHaveBeenCalledWith(encabezados, "id")
  expect(revalidar).toHaveBeenCalledExactlyOnceWith("/admin/egresos")
})
it("errores tecnicos no exponen payload, SQL o mensajes crudos", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {})
  for (const [mock, ejecutar] of [[registrar, () => registrarEgresoAccion({})], [anular, () => anularEgresoAccion("id")], [detalle, () => detalleEgresoAccion("id")]] as const) {
    mock.mockRejectedValue(Error("detalle interno de SQL que no debe salir"))
    expect(await ejecutar()).toEqual({ estado: "error_tecnico" })
  }
  expect(log).toHaveBeenCalledTimes(3)
  for (const args of log.mock.calls) expect(args).toEqual(["[egresos] fallo de operacion", { tipo: "Error" }])
  expect(revalidar).not.toHaveBeenCalled()
})
