import { describe, expect, it, vi } from "vitest"
import { crearVerificadorDeSesion } from "@/lib/modulos/autenticacion/verificador-better-auth"

type EntradaGetSession = { headers: Headers }

// Auth falso: solo expone `api.getSession`, que es lo unico que usa el verificador.
function authConSesion(respuesta: unknown) {
  const getSession = vi.fn<(entrada: EntradaGetSession) => Promise<unknown>>(async () => respuesta)
  return { auth: { api: { getSession } } as never, getSession }
}

describe("verificador de sesion de Better Auth", () => {
  it("devuelve solo id, nombre y email de la sesion", async () => {
    const { auth } = authConSesion({
      session: { token: "token-secreto", userId: "u1", expiresAt: new Date() },
      user: { id: "u1", name: "Sofia", email: "admin@ejemplo.com", emailVerified: false, image: null },
    })

    const identidad = await crearVerificadorDeSesion(auth)(new Headers({ cookie: "x=y" }))

    expect(identidad).toEqual({ id: "u1", nombre: "Sofia", email: "admin@ejemplo.com" })
    expect(JSON.stringify(identidad)).not.toContain("token-secreto")
  })

  it("devuelve null cuando no hay sesion valida", async () => {
    const { auth } = authConSesion(null)

    expect(await crearVerificadorDeSesion(auth)(new Headers())).toBeNull()
  })

  it("pasa a Better Auth los encabezados de la solicitud", async () => {
    const { auth, getSession } = authConSesion(null)
    const encabezados = new Headers({ cookie: "sesion=abc" })

    await crearVerificadorDeSesion(auth)(encabezados)

    expect(getSession).toHaveBeenCalledWith({ headers: encabezados })
  })

  it("propaga las fallas tecnicas en lugar de conceder o negar el acceso por error", async () => {
    const auth = {
      api: {
        getSession: async () => {
          throw new Error("base de datos no disponible")
        },
      },
    } as never

    await expect(crearVerificadorDeSesion(auth)(new Headers())).rejects.toThrow(
      "base de datos no disponible",
    )
  })
})
