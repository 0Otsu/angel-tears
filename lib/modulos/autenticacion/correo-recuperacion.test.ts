import { describe, expect, it } from "vitest"
import { construirCorreoRecuperacion } from "@/lib/modulos/autenticacion/correo-recuperacion"

const URL_ENLACE = "http://localhost:3000/api/auth/reset-password/abc123?callbackURL=%2Fadmin%2Frestablecer"

describe("correo de recuperacion de contrasena", () => {
  const correo = construirCorreoRecuperacion({ para: "admin@ejemplo.com", url: URL_ENLACE })

  it("va al correo de la cuenta y lleva el enlace en texto y en HTML", () => {
    expect(correo.para).toBe("admin@ejemplo.com")
    expect(correo.texto).toContain(URL_ENLACE)
    expect(correo.html).toContain("abc123")
    expect(correo.asunto).toMatch(/contraseña/i)
  })

  it("avisa que sirve una sola vez, vence en 1 hora y cierra las sesiones", () => {
    for (const cuerpo of [correo.texto, correo.html]) {
      expect(cuerpo).toContain("una sola vez")
      expect(cuerpo).toContain("1 hora")
      expect(cuerpo).toContain("se cierran todas tus sesiones")
    }
  })

  it("dice que se ignore el mensaje si no lo pidio la persona", () => {
    expect(correo.texto).toContain("ignorá este mensaje")
  })

  it("escapa el HTML del enlace para que un caracter especial no rompa el atributo", () => {
    const peligroso = 'http://localhost/r?a=1&b="><script>alert(1)</script>'

    const html = construirCorreoRecuperacion({ para: "a@b.c", url: peligroso }).html

    expect(html).not.toContain("<script>")
    expect(html).toContain("&amp;b=&quot;&gt;&lt;script&gt;")
  })

  it("no incluye imagenes ni pixeles de rastreo", () => {
    expect(correo.html).not.toMatch(/<img|<script|<iframe|tracking/i)
  })
})
