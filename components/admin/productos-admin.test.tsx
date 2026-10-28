import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProductosAdmin } from "./productos-admin"
import type { ConsultaAdministrativa, ResultadoGuardarProducto } from "@/lib/modulos/productos/administracion-contrato"

const { crear, editar, refresh } = vi.hoisted(() => ({ crear: vi.fn(), editar: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("@/app/admin/(panel)/productos/acciones", () => ({ crearProductoAccion: crear, editarProductoAccion: editar }))

const consulta: ConsultaAdministrativa = {
  categorias: [{ codigo: "collares", nombre: "Collares" }],
  productos: [{ id: "cd12704c-e5a7-4216-b16e-ad6d7ae47490", nombre: "Collar real", slug: "collar-real", precio: "1500.50", categoriaCodigo: "collares", categoriaNombre: "Collares", descripcion: "Descripción", material: null, medida: null, color: null, cuidados: null, publicado: false, destacado: false, version: 1 }],
}
const nombre = () => screen.getByLabelText("Nombre *") as HTMLInputElement
const precio = () => screen.getByLabelText("Precio de venta (ARS) *") as HTMLInputElement
const enviar = () => fireEvent.submit(screen.getByRole("form"))
function completar() {
  fireEvent.change(nombre(), { target: { value: "Pulsera de muestra" } })
  fireEvent.change(precio(), { target: { value: "90071992547409.93" } })
  fireEvent.change(screen.getByLabelText("Categoría *"), { target: { value: "collares" } })
}
beforeEach(() => { crear.mockReset(); editar.mockReset(); refresh.mockReset() })

describe("productos administrativos", () => {
  it("lista los registros recibidos, incluidos ocultos, y diferencia error de consulta de lista vacia", () => {
    const { rerender } = render(<ProductosAdmin consulta={consulta} />)
    expect(screen.getByText("Collar real")).toBeTruthy()
    expect(screen.getByText("Oculto")).toBeTruthy()
    expect(screen.queryByText(/Aros Luna/)).toBeNull()
    rerender(<ProductosAdmin consulta={{ categorias: [], productos: [] }} errorCarga />)
    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar")
    expect(screen.queryByText("Todavía no hay productos registrados.")).toBeNull()
  })

  it("envia el precio como texto exacto, bloquea doble envio y limpia solo un alta confirmada", async () => {
    let resolver!: (resultado: ResultadoGuardarProducto) => void
    crear.mockReturnValue(new Promise<ResultadoGuardarProducto>((r) => { resolver = r }))
    render(<ProductosAdmin consulta={consulta} />)
    completar()
    enviar()
    expect((screen.getByRole("button", { name: "Guardando…" }) as HTMLButtonElement).disabled).toBe(true)
    enviar()
    expect(crear).toHaveBeenCalledTimes(1)
    expect((crear.mock.calls[0][0] as FormData).get("precio")).toBe("90071992547409.93")
    await act(async () => resolver({ estado: "ok", productoId: "nuevo" }))
    expect(await screen.findByRole("status")).toBeTruthy()
    expect(nombre().value).toBe("")
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("muestra errores de servidor, conserva entradas y lleva el foco al campo invalido", async () => {
    crear.mockResolvedValue({ estado: "datos_invalidos", errores: { precio: "El precio debe ser mayor que cero." } })
    render(<ProductosAdmin consulta={consulta} />)
    completar()
    fireEvent.change(precio(), { target: { value: "0" } })
    enviar()
    expect(await screen.findByText("El precio debe ser mayor que cero.")).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(precio()))
    expect(precio().getAttribute("aria-invalid")).toBe("true")
    expect(nombre().value).toBe("Pulsera de muestra")
    expect(refresh).not.toHaveBeenCalled()
  })

  it.each(["sesion_requerida", "error_tecnico", "conflicto_version"] as const)("conserva el formulario ante %s", async (estado) => {
    crear.mockResolvedValue({ estado })
    render(<ProductosAdmin consulta={consulta} />)
    completar()
    enviar()
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(nombre().value).toBe("Pulsera de muestra")
    expect(precio().value).toBe("90071992547409.93")
    expect(refresh).not.toHaveBeenCalled()
    if (estado === "sesion_requerida") expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/admin/login")
  })

  it("una actualizacion del listado no renueva la version de una edicion que sigue abierta", async () => {
    editar.mockResolvedValue({ estado: "conflicto_version" })
    const { rerender } = render(<ProductosAdmin consulta={consulta} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar Collar real" }))
    fireEvent.change(nombre(), { target: { value: "Mi edición" } })
    rerender(<ProductosAdmin consulta={{ ...consulta, productos: [{ ...consulta.productos[0], version: 2, nombre: "Cambio ajeno" }] }} />)
    enviar()
    await screen.findByRole("alert")
    const datos = editar.mock.calls[0][0] as FormData
    expect(datos.get("version")).toBe("1")
    expect(datos.get("nombre")).toBe("Mi edición")
    expect(datos.get("id")).toBe(consulta.productos[0].id)
    fireEvent.click(screen.getByRole("button", { name: "Recargar listado" }))
    expect(refresh).toHaveBeenCalled()
    expect(screen.getByRole("form", { name: "Nuevo producto" })).toBeTruthy()
  })

  it("sin categorias muestra la preparacion pendiente y no permite crear", () => {
    render(<ProductosAdmin consulta={{ productos: [], categorias: [] }} />)
    expect(screen.getByRole("alert").textContent).toContain("No hay categorías configuradas")
    expect((screen.getByRole("button", { name: "Crear producto" }) as HTMLButtonElement).disabled).toBe(true)
  })
})
