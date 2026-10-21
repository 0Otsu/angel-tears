import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FormularioLogin } from "@/components/admin/formulario-login"

const { iniciarSesion, push, refresh } = vi.hoisted(() => ({
  iniciarSesion: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))
vi.mock("@/lib/infraestructura/auth-cliente", () => ({
  authClient: { signIn: { email: iniciarSesion } },
}))

const CONTRASENA = "una-contrasena-de-prueba-123"

function campos() {
  return {
    email: screen.getByLabelText(/correo/i) as HTMLInputElement,
    contrasena: screen.getByLabelText("Contraseña") as HTMLInputElement,
    boton: screen.getByRole("button", { name: /ingresar/i }) as HTMLButtonElement,
  }
}

function completar(email: string, contrasena: string) {
  const c = campos()
  fireEvent.change(c.email, { target: { value: email } })
  fireEvent.change(c.contrasena, { target: { value: contrasena } })
  return c
}

beforeEach(() => {
  iniciarSesion.mockReset()
  push.mockReset()
  refresh.mockReset()
})

// Frontera de identidad en la interfaz: lo que ve y completa la Administradora al ingresar.
describe("formulario de acceso administrativo", () => {
  it("ofrece campos de correo y contrasena con etiqueta y obligatorios", () => {
    render(<FormularioLogin />)
    const { email, contrasena } = campos()

    expect(email.getAttribute("type")).toBe("email")
    expect(email.hasAttribute("required")).toBe(true)
    expect(contrasena.hasAttribute("required")).toBe(true)
  })

  it("oculta la contrasena y permite que el navegador la gestione", () => {
    render(<FormularioLogin />)
    const { contrasena } = campos()

    expect(contrasena.getAttribute("type")).toBe("password")
    expect(contrasena.getAttribute("autocomplete")).toBe("current-password")
  })

  it("no envia nada y senala cada campo cuando faltan o son invalidos", async () => {
    render(<FormularioLogin />)
    const { email, contrasena, boton } = completar("esto-no-es-un-correo", "")

    fireEvent.click(boton)

    expect(await screen.findByText("Ingresá un correo válido.")).toBeTruthy()
    expect(email.getAttribute("aria-invalid")).toBe("true")
    expect(email.getAttribute("aria-describedby")).toBe("error-email")
    expect(iniciarSesion).not.toHaveBeenCalled()
    expect(contrasena.value).toBe("")
  })

  it("con credenciales correctas inicia sesion y va al panel", async () => {
    iniciarSesion.mockResolvedValue({ data: { token: "no-visible" }, error: null })
    render(<FormularioLogin />)
    const { boton } = completar("admin@ejemplo.com", CONTRASENA)

    fireEvent.click(boton)

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"))
    expect(iniciarSesion).toHaveBeenCalledWith({ email: "admin@ejemplo.com", password: CONTRASENA })
    expect(refresh).toHaveBeenCalled()
  })

  it("con credenciales incorrectas muestra un error neutro, conserva el correo y borra la contrasena", async () => {
    iniciarSesion.mockResolvedValue({
      data: null,
      error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
    })
    render(<FormularioLogin />)
    const { email, contrasena, boton } = completar("admin@ejemplo.com", CONTRASENA)

    fireEvent.click(boton)

    const alerta = await screen.findByRole("alert")
    expect(alerta.textContent).toBe("El correo o la contraseña no son correctos.")
    expect(email.value).toBe("admin@ejemplo.com")
    expect(contrasena.value).toBe("")
    expect(document.activeElement).toBe(contrasena)
    expect(push).not.toHaveBeenCalled()
  })

  it("usa el mismo mensaje sin importar el detalle que devuelva el servidor", async () => {
    iniciarSesion.mockResolvedValue({ data: null, error: { status: 401, code: "USER_NOT_FOUND" } })
    render(<FormularioLogin />)
    fireEvent.click(completar("nadie@ejemplo.com", CONTRASENA).boton)

    expect((await screen.findByRole("alert")).textContent).toBe(
      "El correo o la contraseña no son correctos.",
    )
  })

  it("informa el limite de intentos sin revelar nada de la cuenta", async () => {
    iniciarSesion.mockResolvedValue({ data: null, error: { status: 429, message: "Too many requests" } })
    render(<FormularioLogin />)
    fireEvent.click(completar("admin@ejemplo.com", CONTRASENA).boton)

    const alerta = await screen.findByRole("alert")
    expect(alerta.textContent).toContain("demasiados intentos")
    expect(alerta.textContent).not.toContain("Too many requests")
  })

  it("ante una falla tecnica muestra un mensaje recuperable sin detalle interno", async () => {
    iniciarSesion.mockResolvedValue({
      data: null,
      error: { status: 500, message: 'select "id" from "user" failed at db.ts:12' },
    })
    render(<FormularioLogin />)
    const { contrasena, boton } = completar("admin@ejemplo.com", CONTRASENA)

    fireEvent.click(boton)

    const alerta = await screen.findByRole("alert")
    expect(alerta.textContent).toContain("problema técnico")
    expect(alerta.textContent).not.toMatch(/select|db\.ts|user/i)
    expect(contrasena.value).toBe("")
  })

  it("ante un error de red tambien muestra el mensaje tecnico y vuelve a habilitar el boton", async () => {
    iniciarSesion.mockRejectedValue(new TypeError("Failed to fetch"))
    render(<FormularioLogin />)
    const { boton } = completar("admin@ejemplo.com", CONTRASENA)

    fireEvent.click(boton)

    expect((await screen.findByRole("alert")).textContent).toContain("problema técnico")
    expect(boton.disabled).toBe(false)
  })

  it("deshabilita el boton y no envia dos veces mientras espera la respuesta", async () => {
    let terminar: (valor: unknown) => void = () => {}
    iniciarSesion.mockReturnValue(new Promise((resolver) => (terminar = resolver)))
    render(<FormularioLogin />)
    const { boton } = completar("admin@ejemplo.com", CONTRASENA)

    fireEvent.click(boton)
    await waitFor(() => expect(boton.disabled).toBe(true))
    fireEvent.submit(boton.closest("form") as HTMLFormElement)
    terminar({ data: {}, error: null })

    await waitFor(() => expect(push).toHaveBeenCalled())
    expect(iniciarSesion).toHaveBeenCalledTimes(1)
  })
})
