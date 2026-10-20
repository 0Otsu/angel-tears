import { describe, expect, it } from "vitest"
import { esErrorSesionRequerida } from "@/lib/modulos/autenticacion/contrato"
import { exigirAdministradora } from "@/lib/modulos/autenticacion/exigir-administradora"

// Hasta que Better Auth este integrado (tarea 2.4) la instancia real no reconoce a nadie.
// Esta prueba fija ese comportamiento seguro y debe reemplazarse por las de sesion real.
describe("exigirAdministradora (instancia de la aplicacion)", () => {
  it("rechaza toda solicitud mientras no existan sesiones reales", async () => {
    const encabezados = new Headers({ cookie: "better-auth.session_token=cualquier-valor" })

    let error: unknown
    try {
      await exigirAdministradora(encabezados)
    } catch (e) {
      error = e
    }

    expect(esErrorSesionRequerida(error)).toBe(true)
  })
})
