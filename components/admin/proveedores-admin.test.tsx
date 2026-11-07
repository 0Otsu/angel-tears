import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProveedorAdministrativo } from "@/lib/modulos/proveedores/administracion-contrato"
import { ProveedoresAdmin } from "./proveedores-admin"

const { crear, modificar, actividad, refresh } = vi.hoisted(() => ({ crear: vi.fn(), modificar: vi.fn(), actividad: vi.fn(), refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
vi.mock("@/app/admin/(panel)/proveedores/acciones", () => ({
  crearProveedorAccion: crear, modificarProveedorAccion: modificar, cambiarActividadProveedorAccion: actividad,
}))

const prov = (datos: Partial<ProveedorAdministrativo> & Pick<ProveedorAdministrativo, "id" | "nombre">): ProveedorAdministrativo => ({
  telefono: null, instagram: null, nota: null, activo: true, version: 1, actualizadoEn: "2026-11-07T12:00:00.000Z", ...datos,
})
const lista = [
  prov({ id: "p1", nombre: "Alfa", telefono: "11 5555", nota: "Entrega rápida" }),
  prov({ id: "p2", nombre: "Beta", instagram: "@beta", activo: false, version: 3 }),
]
beforeEach(() => { crear.mockReset(); modificar.mockReset(); actividad.mockReset(); refresh.mockReset() })

describe("listado", () => {
  it("muestra contactos, estado y la falta de datos de contacto", () => {
    render(<ProveedoresAdmin proveedores={[...lista, prov({ id: "p3", nombre: "Gamma" })]} />)
    const items = within(screen.getByRole("list", { name: "Proveedores registrados" })).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText("Activo")).toBeTruthy()
    expect(within(items[0]).getByText("Tel: 11 5555")).toBeTruthy()
    expect(within(items[1]).getByText("Inactivo")).toBeTruthy()
    expect(within(items[2]).getByText("Sin datos de contacto")).toBeTruthy()
  })

  it("filtra por texto y estado, e informa cuando no hay coincidencias", () => {
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "inactivos" } })
    expect(screen.getByRole("status").textContent).toBe("1 proveedor")
    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "zzz" } })
    expect(screen.getByText("No hay proveedores que coincidan con estos filtros.")).toBeTruthy()
  })

  it("no ofrece eliminar proveedores", () => {
    render(<ProveedoresAdmin proveedores={lista} />)
    expect(screen.queryByRole("button", { name: /elimin|borrar/i })).toBeNull()
  })

  it("muestra estado vacio con alta y error de carga con reintento", () => {
    const { unmount } = render(<ProveedoresAdmin proveedores={[]} />)
    expect(screen.getByText("Todavía no hay proveedores")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Nuevo proveedor" })).toBeTruthy()
    unmount()
    render(<ProveedoresAdmin proveedores={[]} errorCarga />)
    expect(screen.getByRole("alert").textContent).toContain("No pudimos consultar los proveedores")
    expect(screen.getByRole("link", { name: "Reintentar consulta" }).getAttribute("href")).toBe("/admin/proveedores")
  })
})

describe("alta y edicion", () => {
  const enviar = () => fireEvent.submit(screen.getByRole("form"))

  it("crea con los campos del formulario y refresca", async () => {
    crear.mockResolvedValue({ estado: "ok", proveedor: prov({ id: "p9", nombre: "Nuevo" }) })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Nuevo proveedor" }))
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Nuevo" } })
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "11 1" } })
    enviar()
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(crear).toHaveBeenCalledWith({ nombre: "Nuevo", telefono: "11 1", instagram: "", nota: "" })
    expect(screen.getByText(/Proveedor Nuevo creado/)).toBeTruthy()
  })

  it("muestra el error del nombre, enfoca el campo y conserva lo escrito", async () => {
    crear.mockResolvedValue({ estado: "datos_invalidos", errores: { nombre: "El nombre es obligatorio." } })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Nuevo proveedor" }))
    fireEvent.change(screen.getByLabelText("Instagram"), { target: { value: "@x" } })
    enviar()
    await screen.findByText("El nombre es obligatorio.")
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Nombre *")))
    expect((screen.getByLabelText("Instagram") as HTMLInputElement).value).toBe("@x")
    expect(refresh).not.toHaveBeenCalled()
  })

  it("edita con la version que se abrio y precarga los datos", async () => {
    modificar.mockResolvedValue({ estado: "ok", proveedor: prov({ id: "p1", nombre: "Alfa 2", version: 2 }) })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar proveedor Alfa" }))
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("11 5555")
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Alfa 2" } })
    enviar()
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(modificar).toHaveBeenCalledWith({ id: "p1", version: 1 }, expect.objectContaining({ nombre: "Alfa 2" }))
  })

  it("ante un conflicto de version conserva los datos y ofrece recargar", async () => {
    modificar.mockResolvedValue({ estado: "conflicto_version", proveedor: prov({ id: "p1", nombre: "Otro", version: 2 }) })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar proveedor Alfa" }))
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Mi cambio" } })
    enviar()
    expect((await screen.findByRole("alert")).textContent).toContain("cambió desde que lo abriste")
    expect((screen.getByLabelText("Nombre *") as HTMLInputElement).value).toBe("Mi cambio")
    fireEvent.click(screen.getByRole("button", { name: "Recargar datos" }))
    expect(refresh).toHaveBeenCalled()
  })

  it("tras un error tecnico conserva los datos para reintentar", async () => {
    crear.mockResolvedValueOnce({ estado: "error_tecnico" }).mockResolvedValueOnce({ estado: "ok", proveedor: prov({ id: "p9", nombre: "Z" }) })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Nuevo proveedor" }))
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Z" } })
    enviar()
    await screen.findByText(/Conservamos tus datos/)
    expect((screen.getByLabelText("Nombre *") as HTMLInputElement).value).toBe("Z")
    enviar()
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it("ofrece volver a iniciar sesion cuando la sesion vencio", async () => {
    crear.mockResolvedValue({ estado: "sesion_requerida" })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Nuevo proveedor" }))
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Z" } })
    enviar()
    await screen.findByRole("link", { name: "Iniciar sesión" })
  })
})

describe("inactivar y reactivar", () => {
  it("inactiva con la version vigente y refresca", async () => {
    actividad.mockResolvedValue({ estado: "ok", proveedor: prov({ id: "p1", nombre: "Alfa", activo: false, version: 2 }) })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Inactivar proveedor Alfa" }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(actividad).toHaveBeenCalledWith({ id: "p1", version: 1 }, false)
  })

  it("reactiva un proveedor inactivo", async () => {
    actividad.mockResolvedValue({ estado: "ok", proveedor: prov({ id: "p2", nombre: "Beta", version: 4 }) })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Reactivar proveedor Beta" }))
    await waitFor(() => expect(actividad).toHaveBeenCalledWith({ id: "p2", version: 3 }, true))
  })

  it("muestra el error en la fila si falla y no refresca", async () => {
    actividad.mockResolvedValue({ estado: "conflicto_version", proveedor: prov({ id: "p1", nombre: "Alfa", version: 5 }) })
    render(<ProveedoresAdmin proveedores={lista} />)
    fireEvent.click(screen.getByRole("button", { name: "Inactivar proveedor Alfa" }))
    expect((await screen.findByRole("alert")).textContent).toContain("cambió desde que lo abriste")
    expect(refresh).not.toHaveBeenCalled()
  })
})
