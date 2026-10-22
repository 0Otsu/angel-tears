import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BotonCerrarSesion } from "@/components/admin/boton-cerrar-sesion"

const { cerrarSesion, push, refresh } = vi.hoisted(() => ({
  cerrarSesion: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))
vi.mock("@/lib/infraestructura/auth-cliente", () => ({ authClient: { signOut: cerrarSesion } }))

beforeEach(() => {
  cerrarSesion.mockReset()
  push.mockReset()
  refresh.mockReset()
})

describe("boton de cerrar sesion", () => {
  it("cierra la sesion en el servidor y vuelve al login", async () => {
    cerrarSesion.mockResolvedValue({ data: { success: true }, error: null })
    render(<BotonCerrarSesion />)

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"))
    expect(cerrarSesion).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalled()
  })

  it("si el servidor no confirma el cierre, no navega y lo avisa", async () => {
    cerrarSesion.mockResolvedValue({ data: null, error: { status: 500, message: "detalle interno" } })
    render(<BotonCerrarSesion />)

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }))

    const alerta = await screen.findByRole("alert")
    expect(alerta.textContent).toContain("No pudimos cerrar la sesión")
    expect(alerta.textContent).not.toContain("detalle interno")
    expect(push).not.toHaveBeenCalled()
  })

  it("ante un error de red tampoco navega y vuelve a habilitar el boton", async () => {
    cerrarSesion.mockRejectedValue(new TypeError("Failed to fetch"))
    render(<BotonCerrarSesion />)
    const boton = screen.getByRole("button", { name: /cerrar sesión/i }) as HTMLButtonElement

    fireEvent.click(boton)

    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos cerrar la sesión")
    expect(push).not.toHaveBeenCalled()
    expect(boton.disabled).toBe(false)
  })

  it("no envia dos veces mientras espera la respuesta", async () => {
    let terminar: (valor: unknown) => void = () => {}
    cerrarSesion.mockReturnValue(new Promise((resolver) => (terminar = resolver)))
    render(<BotonCerrarSesion />)
    const boton = screen.getByRole("button", { name: /cerrar sesión/i }) as HTMLButtonElement

    fireEvent.click(boton)
    await waitFor(() => expect(boton.disabled).toBe(true))
    fireEvent.click(boton)
    terminar({ data: {}, error: null })

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(cerrarSesion).toHaveBeenCalledTimes(1)
  })
})
