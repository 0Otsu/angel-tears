import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FormularioCambioContrasena } from "@/components/admin/formulario-cambio-contrasena"

const { cambiar, revocar, push, refresh } = vi.hoisted(() => ({
  cambiar: vi.fn(),
  revocar: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))
vi.mock("@/lib/infraestructura/auth-cliente", () => ({
  authClient: { changePassword: cambiar, revokeOtherSessions: revocar },
}))

const ACTUAL = "contrasena-actual-123"
const NUEVA = "contrasena-nueva-456"
const ok = { data: {}, error: null }

function campos() {
  return {
    actual: screen.getByLabelText("Contraseña actual") as HTMLInputElement,
    nueva: screen.getByLabelText("Contraseña nueva") as HTMLInputElement,
    confirmacion: screen.getByLabelText("Repetir contraseña nueva") as HTMLInputElement,
    boton: screen.getByRole("button", { name: /cambiar contraseña/i }) as HTMLButtonElement,
  }
}

function completar(actual = ACTUAL, nueva = NUEVA, confirmacion = NUEVA) {
  const c = campos()
  fireEvent.change(c.actual, { target: { value: actual } })
  fireEvent.change(c.nueva, { target: { value: nueva } })
  fireEvent.change(c.confirmacion, { target: { value: confirmacion } })
  return c
}

beforeEach(() => {
  for (const mock of [cambiar, revocar, push, refresh]) mock.mockReset()
})

describe("formulario de cambio de contrasena", () => {
  it("ofrece tres campos de contrasena con etiqueta, obligatorios y con autocompletado correcto", () => {
    render(<FormularioCambioContrasena />)
    const { actual, nueva, confirmacion } = campos()

    for (const campo of [actual, nueva, confirmacion]) {
      expect(campo.getAttribute("type")).toBe("password")
      expect(campo.hasAttribute("required")).toBe(true)
    }
    expect(actual.getAttribute("autocomplete")).toBe("current-password")
    expect(nueva.getAttribute("autocomplete")).toBe("new-password")
    expect(nueva.getAttribute("aria-describedby")).toContain("ayuda-contrasenaNueva")
  })

  it("con datos invalidos no envia nada, senala el campo y conserva lo escrito", async () => {
    render(<FormularioCambioContrasena />)
    const { nueva, boton } = completar(ACTUAL, "corta", "otra")

    fireEvent.click(boton)

    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeTruthy()
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeTruthy()
    expect(nueva.getAttribute("aria-invalid")).toBe("true")
    expect(nueva.getAttribute("aria-describedby")).toContain("error-contrasenaNueva")
    expect(cambiar).not.toHaveBeenCalled()
    expect(nueva.value).toBe("corta")
  })

  it("al cambiar la contrasena cierra las otras sesiones, avisa y vacia los campos", async () => {
    cambiar.mockResolvedValue(ok)
    revocar.mockResolvedValue(ok)
    render(<FormularioCambioContrasena />)
    const { actual, nueva, confirmacion, boton } = completar()

    fireEvent.click(boton)

    const estado = await screen.findByRole("status")
    expect(estado.textContent).toContain("cambiaste tu contraseña")
    expect(estado.textContent).toContain("otras sesiones")
    expect(cambiar).toHaveBeenCalledWith({ currentPassword: ACTUAL, newPassword: NUEVA })
    expect(revocar).toHaveBeenCalledTimes(1)
    expect([actual.value, nueva.value, confirmacion.value]).toEqual(["", "", ""])
    expect(push).not.toHaveBeenCalled() // la sesion actual sigue abierta
  })

  it("con la contrasena actual incorrecta lo senala en ese campo y vacia las contrasenas", async () => {
    cambiar.mockResolvedValue({ data: null, error: { status: 400, code: "INVALID_PASSWORD" } })
    render(<FormularioCambioContrasena />)
    const { actual, nueva, confirmacion, boton } = completar()

    fireEvent.click(boton)

    expect(await screen.findByText("La contraseña actual no es correcta.")).toBeTruthy()
    expect(actual.getAttribute("aria-invalid")).toBe("true")
    expect([actual.value, nueva.value, confirmacion.value]).toEqual(["", "", ""])
    expect(document.activeElement).toBe(actual)
    expect(revocar).not.toHaveBeenCalled()
  })

  it("si la sesion vencio, vuelve al login sin dejar contrasenas escritas", async () => {
    cambiar.mockResolvedValue({ data: null, error: { status: 401 } })
    render(<FormularioCambioContrasena />)
    const { actual, nueva, boton } = completar()

    fireEvent.click(boton)

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"))
    expect([actual.value, nueva.value]).toEqual(["", ""])
  })

  it("informa el limite de intentos y una falla tecnica sin detalle interno", async () => {
    cambiar.mockResolvedValueOnce({ data: null, error: { status: 429, message: "Too many requests" } })
    const { unmount } = render(<FormularioCambioContrasena />)
    fireEvent.click(completar().boton)
    const limite = await screen.findByRole("alert")
    expect(limite.textContent).toContain("demasiados intentos")
    expect(limite.textContent).not.toContain("Too many requests")
    unmount()

    cambiar.mockResolvedValueOnce({ data: null, error: { status: 500, message: 'select "password" from account' } })
    render(<FormularioCambioContrasena />)
    fireEvent.click(completar().boton)
    const tecnico = await screen.findByRole("alert")
    expect(tecnico.textContent).toContain("problema técnico")
    expect(tecnico.textContent).not.toMatch(/select|account|password/i)
  })

  it("si no se pueden cerrar las otras sesiones lo avisa y permite reintentar hasta lograrlo", async () => {
    cambiar.mockResolvedValue(ok)
    revocar.mockResolvedValueOnce({ data: null, error: { status: 500 } })
    render(<FormularioCambioContrasena />)
    fireEvent.click(completar().boton)

    const advertencia = await screen.findByRole("alert")
    expect(advertencia.textContent).toContain("no pudimos cerrar tus otras sesiones")
    const reintento = screen.getByRole("button", { name: /cerrar mis otras sesiones/i })

    revocar.mockResolvedValueOnce({ data: { status: true }, error: null })
    fireEvent.click(reintento)

    expect((await screen.findByRole("status")).textContent).toContain("cerramos tus otras sesiones")
    expect(screen.queryByRole("button", { name: /cerrar mis otras sesiones/i })).toBeNull()
    expect(cambiar).toHaveBeenCalledTimes(1) // la contrasena no se vuelve a cambiar
  })

  it("deshabilita el boton y no envia dos veces mientras guarda", async () => {
    let terminar: (valor: unknown) => void = () => {}
    cambiar.mockReturnValue(new Promise((resolver) => (terminar = resolver)))
    revocar.mockResolvedValue(ok)
    render(<FormularioCambioContrasena />)
    const { boton } = completar()

    fireEvent.click(boton)
    await waitFor(() => expect(boton.disabled).toBe(true))
    fireEvent.submit(boton.closest("form") as HTMLFormElement)
    terminar(ok)

    await screen.findByRole("status")
    expect(cambiar).toHaveBeenCalledTimes(1)
  })
})
