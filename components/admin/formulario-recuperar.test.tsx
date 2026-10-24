import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FormularioRecuperar } from "@/components/admin/formulario-recuperar"

const { pedir } = vi.hoisted(() => ({ pedir: vi.fn() }))

vi.mock("@/lib/infraestructura/auth-cliente", () => ({
  authClient: { requestPasswordReset: pedir, resetPassword: vi.fn() },
}))

const NEUTRO = /si el correo corresponde a la cuenta/i

function enviarCon(email: string) {
  render(<FormularioRecuperar />)
  const campo = screen.getByLabelText("Correo electrónico") as HTMLInputElement
  fireEvent.change(campo, { target: { value: email } })
  fireEvent.click(screen.getByRole("button", { name: /enviarme el enlace/i }))
  return campo
}

beforeEach(() => {
  pedir.mockReset()
})

describe("formulario de recuperacion de contrasena", () => {
  it("ofrece un campo de correo con etiqueta, obligatorio, y un enlace para volver al login", () => {
    render(<FormularioRecuperar />)
    const campo = screen.getByLabelText("Correo electrónico")

    expect(campo.getAttribute("type")).toBe("email")
    expect(campo.hasAttribute("required")).toBe(true)
    expect(screen.getByRole("link", { name: /volver al inicio de sesión/i }).getAttribute("href")).toBe("/admin/login")
  })

  it("pide el enlace y muestra un mensaje neutro que no confirma que la cuenta exista", async () => {
    pedir.mockResolvedValue({ data: { status: true }, error: null })

    enviarCon("admin@ejemplo.com")

    const estado = await screen.findByRole("status")
    expect(estado.textContent).toMatch(NEUTRO)
    expect(estado.textContent).toContain("1 hora")
    expect(pedir).toHaveBeenCalledWith({ email: "admin@ejemplo.com", redirectTo: "/admin/restablecer" })
  })

  it("muestra exactamente el mismo mensaje ante una falla del servidor", async () => {
    pedir.mockResolvedValue({ data: null, error: { status: 500, message: 'select * from "user"' } })

    enviarCon("admin@ejemplo.com")

    const estado = await screen.findByRole("status")
    expect(estado.textContent).toMatch(NEUTRO)
    expect(estado.textContent).not.toMatch(/select|error|falló|problema/i)
  })

  it("muestra el mismo mensaje ante un error de red", async () => {
    pedir.mockRejectedValue(new TypeError("Failed to fetch"))

    enviarCon("admin@ejemplo.com")

    expect((await screen.findByRole("status")).textContent).toMatch(NEUTRO)
  })

  it("con un correo mal escrito lo senala y no llama al servidor", async () => {
    const campo = enviarCon("esto-no-es-un-correo")

    expect(await screen.findByText("Ingresá un correo válido.")).toBeTruthy()
    expect(campo.getAttribute("aria-invalid")).toBe("true")
    expect(campo.getAttribute("aria-describedby")).toBe("error-email")
    expect(document.activeElement).toBe(campo) // el foco vuelve al campo con el error
    expect(pedir).not.toHaveBeenCalled()
  })

  it("informa el limite de pedidos sin revelar nada de la cuenta", async () => {
    pedir.mockResolvedValue({ data: null, error: { status: 429, message: "Too many requests" } })

    enviarCon("admin@ejemplo.com")

    const alerta = await screen.findByRole("alert")
    expect(alerta.textContent).toContain("demasiados pedidos")
    expect(alerta.textContent).not.toContain("Too many requests")
  })

  it("no envia dos veces mientras espera la respuesta", async () => {
    let terminar: (valor: unknown) => void = () => {}
    pedir.mockReturnValue(new Promise((resolver) => (terminar = resolver)))
    enviarCon("admin@ejemplo.com")
    const boton = screen.getByRole("button", { name: /enviando/i }) as HTMLButtonElement

    await waitFor(() => expect(boton.disabled).toBe(true))
    fireEvent.submit(boton.closest("form") as HTMLFormElement)
    terminar({ data: {}, error: null })

    await screen.findByRole("status")
    expect(pedir).toHaveBeenCalledTimes(1)
  })
})
