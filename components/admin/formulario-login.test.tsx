import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FormularioLogin } from "@/components/admin/formulario-login"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Frontera de identidad en la interfaz: lo que ve y completa la Administradora al ingresar.
// Estas comprobaciones deben seguir valiendo cuando el login deje de ser un mock (tarea 2.3).
describe("formulario de acceso administrativo", () => {
  it("ofrece un campo de correo y otro de contrasena, ambos con etiqueta y obligatorios", () => {
    render(<FormularioLogin />)

    const usuario = screen.getByLabelText(/correo/i)
    const contrasena = screen.getByLabelText("Contraseña")

    expect(usuario.hasAttribute("required")).toBe(true)
    expect(contrasena.hasAttribute("required")).toBe(true)
  })

  it("oculta la contrasena y permite que el navegador la gestione", () => {
    render(<FormularioLogin />)

    const contrasena = screen.getByLabelText("Contraseña")

    expect(contrasena.getAttribute("type")).toBe("password")
    expect(contrasena.getAttribute("autocomplete")).toBe("current-password")
  })

  it("tiene un boton para enviar el formulario", () => {
    render(<FormularioLogin />)

    const boton = screen.getByRole("button", { name: /ingresar/i })

    expect(boton.getAttribute("type")).toBe("submit")
  })
})
