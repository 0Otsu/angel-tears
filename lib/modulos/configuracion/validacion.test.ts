import { describe, expect, it } from "vitest"
import { configuracionPrueba } from "@/pruebas/fixtures/configuracion-negocio"
import { esquemaConfiguracionNegocio } from "./validacion"

describe("validación de Configuración del negocio", () => {
  it("normaliza contactos y ordena las franjas conservando sus horas", () => {
    const datos = esquemaConfiguracionNegocio.parse({
      ...configuracionPrueba,
      direccion: "  Local 123   ",
      horarios: { ...configuracionPrueba.horarios, lunes: [...configuracionPrueba.horarios.lunes].reverse() },
      telefonoWhatsApp: "+54 9 (11) 0000-0000",
      usuarioInstagram: "https://instagram.com/Accesorios.Prueba/?igsh=referencia",
      comoLlegar: "https://maps.app.goo.gl/Enlace123",
    })
    expect(datos).toMatchObject({
      direccion: "Local 123", horarios: configuracionPrueba.horarios,
      telefonoWhatsApp: "5491100000000", usuarioInstagram: "accesorios.prueba",
    })
    expect(esquemaConfiguracionNegocio.parse({ ...datos, usuarioInstagram: "@Accesorios.Prueba" }).usuarioInstagram).toBe("accesorios.prueba")
  })

  it.each([
    [{ apertura: "24:00", cierre: "23:00" }],
    [{ apertura: "9:30", cierre: "12:15" }],
    [{ apertura: "09:30", cierre: "08:00" }],
    [{ apertura: "09:30", cierre: "09:30" }],
    [{ apertura: "11:30", cierre: "13:00" }, { apertura: "09:30", cierre: "12:15" }],
    [...configuracionPrueba.horarios.lunes, { apertura: "20:00", cierre: "22:00" }],
  ].map(lunes => ({ lunes })))("rechaza franjas inválidas para el mismo día %#", ({ lunes }) => {
    expect(esquemaConfiguracionNegocio.safeParse({
      ...configuracionPrueba, horarios: { ...configuracionPrueba.horarios, lunes },
    }).success).toBe(false)
  })

  it("acepta días cerrados y franjas consecutivas", () => {
    const lunes = [{ apertura: "09:30", cierre: "12:07" }, { apertura: "12:07", cierre: "13:00" }]
    const datos = esquemaConfiguracionNegocio.parse({
      ...configuracionPrueba, horarios: { ...configuracionPrueba.horarios, lunes },
    })
    expect(datos.horarios.lunes).toEqual(lunes)
    expect(datos.horarios.domingo).toEqual([])
  })

  it.each([
    { horarios: { lunes: [] } },
    { horarios: { ...configuracionPrueba.horarios, feriado: [] } },
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
