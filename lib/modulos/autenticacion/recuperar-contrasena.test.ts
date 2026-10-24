import { describe, expect, it, vi } from "vitest"
import {
  RUTA_RESTABLECER,
  restablecerContrasena,
  solicitarRecuperacion,
  type ClienteRecuperacion,
} from "@/lib/modulos/autenticacion/recuperar-contrasena"

type Respuesta = { error: { status?: number; code?: string } | null }

function clienteFalso(opciones: { solicitud?: Respuesta | Error; reinicio?: Respuesta | Error } = {}) {
  const resolver = (valor: Respuesta | Error | undefined) =>
    valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor ?? { error: null })
  const requestPasswordReset = vi.fn<ClienteRecuperacion["requestPasswordReset"]>(async () => resolver(opciones.solicitud))
  const resetPassword = vi.fn<ClienteRecuperacion["resetPassword"]>(async () => resolver(opciones.reinicio))
  const cliente: ClienteRecuperacion = { requestPasswordReset, resetPassword }
  return { cliente, requestPasswordReset, resetPassword }
}

describe("solicitarRecuperacion", () => {
  it("pide el enlace con el correo y la ruta del formulario de restablecimiento", async () => {
    const { cliente, requestPasswordReset } = clienteFalso()

    const resultado = await solicitarRecuperacion(cliente, "  admin@ejemplo.com ")

    expect(resultado).toEqual({ estado: "solicitada" })
    expect(requestPasswordReset).toHaveBeenCalledWith({ email: "admin@ejemplo.com", redirectTo: RUTA_RESTABLECER })
  })

  it("un correo mal escrito se informa sin llamar al servidor", async () => {
    const { cliente, requestPasswordReset } = clienteFalso()

    const resultado = await solicitarRecuperacion(cliente, "esto-no-es-un-correo")

    expect(resultado.estado).toBe("email_invalido")
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it("el resultado es el mismo para cualquier respuesta o falla del servidor que no sea el limite", async () => {
    const casos: Array<Respuesta | Error> = [
      { error: null },
      { error: { status: 400, code: "RESET_PASSWORD_DISABLED" } },
      { error: { status: 404 } },
      { error: { status: 500 } },
      { error: { status: 503 } },
      new TypeError("Failed to fetch"),
    ]
    for (const solicitud of casos) {
      const { cliente } = clienteFalso({ solicitud })
      expect(await solicitarRecuperacion(cliente, "admin@ejemplo.com")).toEqual({ estado: "solicitada" })
    }
  })

  it("informa el limite de intentos, que no depende de la cuenta", async () => {
    const { cliente } = clienteFalso({ solicitud: { error: { status: 429 } } })

    expect(await solicitarRecuperacion(cliente, "admin@ejemplo.com")).toEqual({ estado: "demasiados_intentos" })
  })
})

describe("restablecerContrasena", () => {
  const datos = { token: "token-del-correo", contrasenaNueva: "contrasena-nueva-456", confirmacion: "contrasena-nueva-456" }

  it("cambia la contrasena con el token del enlace", async () => {
    const { cliente, resetPassword } = clienteFalso()

    expect(await restablecerContrasena(cliente, datos)).toEqual({ estado: "ok" })
    expect(resetPassword).toHaveBeenCalledWith({ newPassword: "contrasena-nueva-456", token: "token-del-correo" })
  })

  it("sin token el enlace es invalido y no se llama al servidor", async () => {
    const { cliente, resetPassword } = clienteFalso()

    expect(await restablecerContrasena(cliente, { ...datos, token: undefined })).toEqual({ estado: "enlace_invalido" })
    expect(await restablecerContrasena(cliente, { ...datos, token: "" })).toEqual({ estado: "enlace_invalido" })
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it("valida el largo y la confirmacion antes de enviar, sin repetir las contrasenas", async () => {
    const { cliente, resetPassword } = clienteFalso()

    const corta = await restablecerContrasena(cliente, { ...datos, contrasenaNueva: "corta", confirmacion: "corta" })
    const distinta = await restablecerContrasena(cliente, { ...datos, confirmacion: "otra-distinta-789" })

    expect(corta.estado).toBe("datos_invalidos")
    expect(distinta.estado).toBe("datos_invalidos")
    if (corta.estado === "datos_invalidos") expect(corta.errores.contrasenaNueva).toContain("8")
    if (distinta.estado === "datos_invalidos") expect(distinta.errores.confirmacion).toContain("no coinciden")
    expect(JSON.stringify([corta, distinta])).not.toContain("otra-distinta-789")
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it.each([
    [{ status: 400, code: "INVALID_TOKEN" }, "enlace_invalido"],
    [{ status: 400, code: "USER_NOT_FOUND" }, "enlace_invalido"],
    [{ status: 429 }, "demasiados_intentos"],
    [{ status: 500 }, "error_tecnico"],
    [{ status: 503 }, "error_tecnico"],
  ] as const)("ante %j del servidor responde %s", async (error, estado) => {
    const { cliente } = clienteFalso({ reinicio: { error } })

    expect(await restablecerContrasena(cliente, datos)).toEqual({ estado })
  })

  it("si el servidor rechaza el largo de la contrasena lo informa como dato invalido (el enlace sigue vigente)", async () => {
    const { cliente } = clienteFalso({ reinicio: { error: { status: 400, code: "PASSWORD_TOO_SHORT" } } })

    const resultado = await restablecerContrasena(cliente, datos)

    expect(resultado.estado).toBe("datos_invalidos")
  })

  it("ante un fallo de red responde error tecnico", async () => {
    const { cliente } = clienteFalso({ reinicio: new TypeError("Failed to fetch") })

    expect(await restablecerContrasena(cliente, datos)).toEqual({ estado: "error_tecnico" })
  })

  it("el resultado nunca contiene la contrasena ni el token", async () => {
    const casos = [
      clienteFalso({ reinicio: { error: { status: 400, code: "INVALID_TOKEN" } } }),
      clienteFalso({ reinicio: { error: { status: 500 } } }),
      clienteFalso(),
    ]
    for (const { cliente } of casos) {
      const texto = JSON.stringify(await restablecerContrasena(cliente, datos))
      expect(texto).not.toContain("contrasena-nueva-456")
      expect(texto).not.toContain("token-del-correo")
    }
  })
})
