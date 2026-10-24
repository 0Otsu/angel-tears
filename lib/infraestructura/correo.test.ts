import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ErrorConfiguracionCorreo,
  ErrorEnvioCorreo,
  crearEnviadorDesdeEntorno,
  crearEnviadorResend,
  type MensajeCorreo,
} from "@/lib/infraestructura/correo"

const mensaje: MensajeCorreo = {
  para: "admin@ejemplo.com",
  asunto: "Asunto",
  texto: "Texto con https://ejemplo.com/reset/TOKEN-SECRETO",
  html: "<p>Html con https://ejemplo.com/reset/TOKEN-SECRETO</p>",
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("enviador de correo con Resend", () => {
  it("entrega el mensaje al proveedor con el remitente configurado", async () => {
    const send = vi.fn(async () => ({ error: null }))
    const enviar = crearEnviadorResend({ apiKey: "clave", remitente: "Angel Tears <no-responder@ejemplo.com>", cliente: { emails: { send } } })

    await enviar(mensaje)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith({
      from: "Angel Tears <no-responder@ejemplo.com>",
      to: "admin@ejemplo.com",
      subject: "Asunto",
      text: mensaje.texto,
      html: mensaje.html,
    })
  })

  it("si el proveedor rechaza el envio lanza un error que solo guarda el codigo, sin el detalle", async () => {
    const send = vi.fn(async () => ({
      error: { name: "validation_error", statusCode: 422, message: "detalle con TOKEN-SECRETO y admin@ejemplo.com" },
    }))
    const enviar = crearEnviadorResend({ apiKey: "clave", remitente: "a@b.c", cliente: { emails: { send } } })

    const error = await enviar(mensaje).then(
      () => null,
      (e: unknown) => e as ErrorEnvioCorreo,
    )

    expect(error).toBeInstanceOf(ErrorEnvioCorreo)
    expect(error?.codigo).toBe("validation_error")
    expect(`${error?.message} ${error?.stack}`).not.toContain("TOKEN-SECRETO")
    expect(`${error?.message} ${error?.stack}`).not.toContain("admin@ejemplo.com")
  })

  it("propaga las fallas de red del cliente", async () => {
    const send = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })
    const enviar = crearEnviadorResend({ apiKey: "clave", remitente: "a@b.c", cliente: { emails: { send } } })

    await expect(enviar(mensaje)).rejects.toThrow("fetch failed")
  })
})

describe("enviador configurado desde el entorno", () => {
  it("falla con un mensaje claro, sin valores, si falta la clave o el remitente", () => {
    vi.stubEnv("RESEND_API_KEY", "")
    vi.stubEnv("RESEND_FROM", "a@b.c")
    expect(() => crearEnviadorDesdeEntorno()).toThrow(ErrorConfiguracionCorreo)
    expect(() => crearEnviadorDesdeEntorno()).toThrow("RESEND_API_KEY")

    vi.stubEnv("RESEND_API_KEY", "clave-secreta-123")
    vi.stubEnv("RESEND_FROM", "")
    expect(() => crearEnviadorDesdeEntorno()).toThrow("RESEND_FROM")
    try {
      crearEnviadorDesdeEntorno()
    } catch (error) {
      expect((error as Error).message).not.toContain("clave-secreta-123")
    }
  })

  it("con ambas variables devuelve un enviador", () => {
    vi.stubEnv("RESEND_API_KEY", "clave-secreta-123")
    vi.stubEnv("RESEND_FROM", "Angel Tears <no-responder@ejemplo.com>")

    expect(typeof crearEnviadorDesdeEntorno()).toBe("function")
  })
})
