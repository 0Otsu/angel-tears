import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FormularioRestablecer } from "@/components/admin/formulario-restablecer"

const { reiniciar } = vi.hoisted(() => ({ reiniciar: vi.fn() }))

vi.mock("@/lib/infraestructura/auth-cliente", () => ({
  authClient: { requestPasswordReset: vi.fn(), resetPassword: reiniciar },
}))

const TOKEN = "token-secreto-del-correo"
const NUEVA = "contrasena-nueva-456"

function campos() {
  return {
    nueva: screen.getByLabelText("Contraseña nueva") as HTMLInputElement,
    confirmacion: screen.getByLabelText("Repetir contraseña nueva") as HTMLInputElement,
    boton: screen.getByRole("button", { name: /cambiar contraseña/i }) as HTMLButtonElement,
  }
}

function completar(nueva = NUEVA, confirmacion = NUEVA) {
  const c = campos()
  fireEvent.change(c.nueva, { target: { value: nueva } })
  fireEvent.change(c.confirmacion, { target: { value: confirmacion } })
  return c
}

beforeEach(() => {
  reiniciar.mockReset()
})

describe("formulario de restablecimiento de contrasena", () => {
  it("sin token o con error en el enlace muestra que no es valido y ofrece pedir uno nuevo", () => {
    const { unmount } = render(<FormularioRestablecer token={undefined} enlaceInvalido={false} />)
    expect(screen.getByRole("alert").textContent).toContain("no es válido o ya venció")
    expect(screen.getByRole("link", { name: /pedir un enlace nuevo/i }).getAttribute("href")).toBe("/admin/recuperar")
    expect(screen.queryByLabelText("Contraseña nueva")).toBeNull()
    unmount()

    render(<FormularioRestablecer token={TOKEN} enlaceInvalido={true} />)
    expect(screen.getByRole("alert").textContent).toContain("no es válido o ya venció")
  })

  it("con un enlace valido ofrece los dos campos de contrasena nueva", () => {
    render(<FormularioRestablecer token={TOKEN} enlaceInvalido={false} />)
    const { nueva, confirmacion } = campos()

    for (const campo of [nueva, confirmacion]) {
      expect(campo.getAttribute("type")).toBe("password")
      expect(campo.getAttribute("autocomplete")).toBe("new-password")
      expect(campo.hasAttribute("required")).toBe(true)
    }
  })

  it("con datos invalidos no envia nada y conserva lo escrito para corregirlo", async () => {
    render(<FormularioRestablecer token={TOKEN} enlaceInvalido={false} />)
    const { nueva, boton } = completar("corta", "otra")

    fireEvent.click(boton)

    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeTruthy()
    expect(nueva.getAttribute("aria-invalid")).toBe("true")
    expect(reiniciar).not.toHaveBeenCalled()
    expect(nueva.value).toBe("corta")
  })

  it("al restablecer avisa, vacia los campos y lleva a iniciar sesion, sin iniciarla automaticamente", async () => {
    reiniciar.mockResolvedValue({ data: { status: true }, error: null })
    render(<FormularioRestablecer token={TOKEN} enlaceInvalido={false} />)

    fireEvent.click(completar().boton)

    const estado = await screen.findByRole("status")
    expect(estado.textContent).toContain("cambiaste tu contraseña")
    expect(estado.textContent).toContain("cerramos todas tus sesiones")
    expect(reiniciar).toHaveBeenCalledWith({ newPassword: NUEVA, token: TOKEN })
    expect(screen.getByRole("link", { name: /ir a iniciar sesión/i }).getAttribute("href")).toBe("/admin/login")
    expect(screen.queryByLabelText("Contraseña nueva")).toBeNull()
  })

  it("si el servidor dice que el enlace es invalido o vencio, lo informa y borra las contrasenas", async () => {
    reiniciar.mockResolvedValue({ data: null, error: { status: 400, code: "INVALID_TOKEN" } })
    render(<FormularioRestablecer token={TOKEN} enlaceInvalido={false} />)

    fireEvent.click(completar().boton)

    expect((await screen.findByRole("alert")).textContent).toContain("no es válido o ya venció")
    expect(screen.queryByLabelText("Contraseña nueva")).toBeNull()
  })

  it("si el servidor rechaza el largo de la contrasena el enlace sigue vigente para reintentar", async () => {
    reiniciar.mockResolvedValueOnce({ data: null, error: { status: 400, code: "PASSWORD_TOO_SHORT" } })
    render(<FormularioRestablecer token={TOKEN} enlaceInvalido={false} />)

    fireEvent.click(completar().boton)

    expect(await screen.findByText(/no cumple el largo permitido/i)).toBeTruthy()
    // El formulario sigue ahi, con el mismo enlace, para elegir otra.
    reiniciar.mockResolvedValueOnce({ data: { status: true }, error: null })
    fireEvent.click(completar("otra-contrasena-valida-789", "otra-contrasena-valida-789").boton)
    expect((await screen.findByRole("status")).textContent).toContain("cambiaste tu contraseña")
  })

  it("informa el limite de intentos y una falla tecnica sin detalle interno, vaciando los campos", async () => {
    reiniciar.mockResolvedValueOnce({ data: null, error: { status: 429, message: "Too many requests" } })
    const { unmount } = render(<FormularioRestablecer token={TOKEN} enlaceInvalido={false} />)
    const primero = completar()
    fireEvent.click(primero.boton)
    const limite = await screen.findByRole("alert")
    expect(limite.textContent).toContain("demasiados intentos")
    expect(limite.textContent).not.toContain("Too many requests")
    expect([primero.nueva.value, primero.confirmacion.value]).toEqual(["", ""])
    unmount()

    reiniciar.mockResolvedValueOnce({ data: null, error: { status: 500, message: 'select "password" from account' } })
    render(<FormularioRestablecer token={TOKEN} enlaceInvalido={false} />)
    fireEvent.click(completar().boton)
    const tecnico = await screen.findByRole("alert")
    expect(tecnico.textContent).toContain("problema técnico")
    expect(tecnico.textContent).not.toMatch(/select|account|password/i)
  })

  it("no muestra el token en la pantalla y no envia dos veces mientras guarda", async () => {
    let terminar: (valor: unknown) => void = () => {}
    reiniciar.mockReturnValue(new Promise((resolver) => (terminar = resolver)))
    const { container } = render(<FormularioRestablecer token={TOKEN} enlaceInvalido={false} />)
    const { boton } = completar()

    fireEvent.click(boton)
    await waitFor(() => expect(boton.disabled).toBe(true))
    fireEvent.submit(boton.closest("form") as HTMLFormElement)
    expect(container.innerHTML).not.toContain(TOKEN)
    terminar({ data: { status: true }, error: null })

    await screen.findByRole("status")
    expect(reiniciar).toHaveBeenCalledTimes(1)
  })
})
