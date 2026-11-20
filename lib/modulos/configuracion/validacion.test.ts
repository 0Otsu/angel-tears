import { describe, expect, it } from "vitest"
import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import { esquemaConfiguracionNegocio } from "./validacion"

describe("validación de Configuración del negocio", () => {
  it("normaliza WhatsApp, perfil, texto y días sin cambiar el horario", () => {
    const datos = esquemaConfiguracionNegocio.parse({
      ...configuracionPrueba,
      direccion: "  Local 123   ",
      diasAtencion: ["viernes", "lunes", "viernes"],
      telefonoWhatsApp: "+54 9 (11) 0000-0000",
      usuarioInstagram: "https://instagram.com/Accesorios.Prueba/?igsh=referencia",
      comoLlegar: "https://maps.app.goo.gl/Enlace123",
    })
    expect(datos).toMatchObject({
      direccion: "Local 123", diasAtencion: ["lunes", "viernes"], apertura: "09:30",
      telefonoWhatsApp: "5491100000000", usuarioInstagram: "accesorios.prueba",
    })
    expect(esquemaConfiguracionNegocio.parse({ ...datos, usuarioInstagram: "@Accesorios.Prueba" }).usuarioInstagram).toBe("accesorios.prueba")
  })

  it.each([
    { diasAtencion: [] },
    { diasAtencion: ["feriado"] },
    { apertura: "24:00" },
    { cierre: "08:00" },
    { cierre: "09:30" },
    { telefonoWhatsApp: "011-5555-5555" },
    { telefonoWhatsApp: "+54 911 letras" },
    { telefonoWhatsApp: "+1234567890123456" },
    { comoLlegar: "javascript:alert(1)" },
    { comoLlegar: "http://maps.app.goo.gl/Enlace123" },
    { comoLlegar: "https://maps.app.goo.gl.example.test/enlace" },
    { comoLlegar: "https://persona@maps.app.goo.gl/Enlace123" },
    { comoLlegar: "https://www.google.com/url?q=https://example.test" },
    { usuarioInstagram: "javascript:alert(1)" },
    { usuarioInstagram: "https://instagram.com@otro.example/prueba" },
    { usuarioInstagram: "https://www.instagram.com/p/publicacion/" },
    { id: 2 },
  ])("rechaza datos fuera del contrato %#", (alteracion) => {
    expect(esquemaConfiguracionNegocio.safeParse({ ...configuracionPrueba, ...alteracion }).success).toBe(false)
  })
})
