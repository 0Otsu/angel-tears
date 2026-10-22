import { describe, expect, it, vi } from "vitest"
import {
  cambiarContrasena,
  cerrarOtrasSesiones,
  validarCambioContrasena,
  type ClienteCambioContrasena,
} from "@/lib/modulos/autenticacion/cambiar-contrasena"

const ACTUAL = "contrasena-actual-123"
const NUEVA = "contrasena-nueva-456"
const datos = { contrasenaActual: ACTUAL, contrasenaNueva: NUEVA, confirmacion: NUEVA }

type Respuesta = { error: { status?: number; code?: string } | null }
const sinError: Respuesta = { error: null }

function clienteFalso(opciones: { cambio?: Respuesta | Error; revocar?: Respuesta | Error } = {}) {
  const llamadas: string[] = []
  const resolver = (valor: Respuesta | Error | undefined) =>
    valor instanceof Error ? Promise.reject(valor) : Promise.resolve(valor ?? sinError)
  const changePassword = vi.fn<ClienteCambioContrasena["changePassword"]>(async () => {
    llamadas.push("changePassword")
    return resolver(opciones.cambio)
  })
  const revokeOtherSessions = vi.fn<ClienteCambioContrasena["revokeOtherSessions"]>(async () => {
    llamadas.push("revokeOtherSessions")
    return resolver(opciones.revocar)
  })
  const cliente: ClienteCambioContrasena = { changePassword, revokeOtherSessions }
  return { cliente, changePassword, revokeOtherSessions, llamadas }
}

describe("validacion del cambio de contrasena", () => {
  it("acepta datos correctos", () => {
    expect(validarCambioContrasena(datos)).toBeNull()
  })

  it("senala cada campo invalido sin repetir las contrasenas", () => {
    const errores = validarCambioContrasena({ contrasenaActual: "", contrasenaNueva: "corta", confirmacion: "otra" })

    expect(Object.keys(errores ?? {}).sort()).toEqual(["confirmacion", "contrasenaActual", "contrasenaNueva"])
    expect(JSON.stringify(errores)).not.toContain("corta")
    expect(JSON.stringify(errores)).not.toContain("otra")
  })

  it("exige que la confirmacion coincida y respeta el largo de 8 a 128", () => {
    expect(validarCambioContrasena({ ...datos, confirmacion: "distinta-123" })?.confirmacion).toContain("no coinciden")
    expect(validarCambioContrasena({ ...datos, contrasenaNueva: "1234567", confirmacion: "1234567" })?.contrasenaNueva).toContain("8")
    const larga = "a".repeat(129)
    expect(validarCambioContrasena({ ...datos, contrasenaNueva: larga, confirmacion: larga })?.contrasenaNueva).toContain("128")
  })
})

describe("cambiarContrasena", () => {
  it("cambia la contrasena y despues cierra solo las otras sesiones, en ese orden", async () => {
    const { cliente, changePassword, llamadas } = clienteFalso()

    const resultado = await cambiarContrasena(cliente, datos)

    expect(resultado).toEqual({ estado: "ok" })
    expect(llamadas).toEqual(["changePassword", "revokeOtherSessions"])
    expect(changePassword).toHaveBeenCalledWith({ currentPassword: ACTUAL, newPassword: NUEVA })
  })

  it("nunca pide a Better Auth que revoque dentro del cambio (esa opcion reemplaza la sesion actual)", async () => {
    const { cliente, changePassword } = clienteFalso()

    await cambiarContrasena(cliente, datos)

    const entrada = changePassword.mock.calls[0][0]
    expect(Object.keys(entrada).sort()).toEqual(["currentPassword", "newPassword"])
    expect("revokeOtherSessions" in entrada).toBe(false)
  })

  it("con datos invalidos no llama al servidor", async () => {
    const { cliente, llamadas } = clienteFalso()

    const resultado = await cambiarContrasena(cliente, { ...datos, confirmacion: "otra" })

    expect(resultado.estado).toBe("datos_invalidos")
    expect(llamadas).toEqual([])
  })

  it("con la contrasena actual incorrecta no cierra ninguna sesion", async () => {
    const { cliente, llamadas } = clienteFalso({ cambio: { error: { status: 400, code: "INVALID_PASSWORD" } } })

    const resultado = await cambiarContrasena(cliente, datos)

    expect(resultado).toEqual({ estado: "contrasena_actual_incorrecta" })
    expect(llamadas).toEqual(["changePassword"])
  })

  it.each([
    [401, "sesion_vencida"],
    [429, "demasiados_intentos"],
    [500, "error_tecnico"],
    [503, "error_tecnico"],
  ] as const)("ante un %i del servidor responde %s y no cierra sesiones", async (status, estado) => {
    const { cliente, llamadas } = clienteFalso({ cambio: { error: { status } } })

    expect(await cambiarContrasena(cliente, datos)).toEqual({ estado })
    expect(llamadas).toEqual(["changePassword"])
  })

  it("ante un fallo de red responde error tecnico", async () => {
    const { cliente } = clienteFalso({ cambio: new TypeError("Failed to fetch") })

    expect(await cambiarContrasena(cliente, datos)).toEqual({ estado: "error_tecnico" })
  })

  it("si falla el cierre de las otras sesiones lo informa: la contrasena ya cambio", async () => {
    const { cliente } = clienteFalso({ revocar: { error: { status: 500 } } })

    expect(await cambiarContrasena(cliente, datos)).toEqual({ estado: "cambiada_sin_cerrar_otras" })
  })

  it("si el cierre falla por un error de red tambien lo informa", async () => {
    const { cliente } = clienteFalso({ revocar: new TypeError("Failed to fetch") })

    expect(await cambiarContrasena(cliente, datos)).toEqual({ estado: "cambiada_sin_cerrar_otras" })
  })

  it("el resultado nunca contiene las contrasenas", async () => {
    const casos = [
      clienteFalso({ cambio: { error: { status: 400, code: "INVALID_PASSWORD" } } }),
      clienteFalso({ revocar: { error: { status: 500 } } }),
      clienteFalso(),
    ]
    for (const { cliente } of casos) {
      const texto = JSON.stringify(await cambiarContrasena(cliente, datos))
      expect(texto).not.toContain(ACTUAL)
      expect(texto).not.toContain(NUEVA)
    }
  })
})

describe("cerrarOtrasSesiones", () => {
  it("cierra las otras sesiones", async () => {
    const { cliente, llamadas } = clienteFalso()

    expect(await cerrarOtrasSesiones(cliente)).toEqual({ estado: "ok" })
    expect(llamadas).toEqual(["revokeOtherSessions"])
  })

  it.each([
    [401, "sesion_vencida"],
    [429, "demasiados_intentos"],
    [500, "error_tecnico"],
  ] as const)("ante un %i responde %s", async (status, estado) => {
    const { cliente } = clienteFalso({ revocar: { error: { status } } })

    expect(await cerrarOtrasSesiones(cliente)).toEqual({ estado })
  })

  it("ante un fallo de red responde error tecnico", async () => {
    const { cliente } = clienteFalso({ revocar: new TypeError("Failed to fetch") })

    expect(await cerrarOtrasSesiones(cliente)).toEqual({ estado: "error_tecnico" })
  })
})
