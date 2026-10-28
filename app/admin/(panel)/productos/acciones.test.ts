import { beforeEach, describe, expect, it, vi } from "vitest"
import { crearProductoAccion, editarProductoAccion } from "./acciones"

const { crear, editar, revalidar } = vi.hoisted(() => ({ crear: vi.fn(), editar: vi.fn(), revalidar: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "sesion-del-guard" }) }))
vi.mock("next/cache", () => ({ revalidatePath: revalidar }))
vi.mock("@/lib/modulos/productos/administracion-aplicacion", () => ({ obtenerAdministracionProductos: () => ({ crear, editar }) }))
const formulario = () => {
  const datos = new FormData()
  for (const [clave, valor] of Object.entries({ nombre: "Collar", precio: "90071992547409.93", categoriaCodigo: "collares", publicado: "true", slug: "intruso", id: "id-producto", version: "3" })) datos.set(clave, valor)
  return datos
}
beforeEach(() => { crear.mockReset(); editar.mockReset(); revalidar.mockReset() })

describe("Server Actions de Producto 2.1", () => {
  it("pasa encabezados al caso de uso, limita los campos y refresca solo tras confirmar", async () => {
    crear.mockResolvedValue({ estado: "ok", productoId: "nuevo" })
    expect(await crearProductoAccion(formulario())).toEqual({ estado: "ok", productoId: "nuevo" })
    expect(crear.mock.calls[0][0].get("cookie")).toBe("sesion-del-guard")
    expect(crear.mock.calls[0][1]).toMatchObject({ nombre: "Collar", precio: "90071992547409.93" })
    expect(crear.mock.calls[0][1]).not.toHaveProperty("publicado")
    expect(crear.mock.calls[0][1]).not.toHaveProperty("slug")
    expect(revalidar).toHaveBeenCalledExactlyOnceWith("/admin/productos")
  })

  it("envia referencia y version separadas y no revalida una edicion rechazada", async () => {
    editar.mockResolvedValue({ estado: "sesion_requerida" })
    expect(await editarProductoAccion(formulario())).toEqual({ estado: "sesion_requerida" })
    expect(editar.mock.calls[0][1]).toEqual({ id: "id-producto", version: "3" })
    expect(revalidar).not.toHaveBeenCalled()
    expect(crear).not.toHaveBeenCalled()
  })

  it("un fallo tecnico no filtra SQL, payload o stack y permite reintentar", async () => {
    crear.mockRejectedValue(new Error("SQL secreto con datos internos"))
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      expect(await crearProductoAccion(formulario())).toEqual({ estado: "error_tecnico" })
      expect(JSON.stringify(log.mock.calls)).not.toContain("SQL secreto")
      expect(revalidar).not.toHaveBeenCalled()
    } finally { log.mockRestore() }
  })
})
