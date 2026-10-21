import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { atenderSolicitudAuth } from "@/lib/infraestructura/auth-manejador"

const SECRETO = "contrasena-que-no-debe-aparecer"

let registros: unknown[][] = []

beforeEach(() => {
  registros = []
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    registros.push(args)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function cuerpoDe(respuesta: Response): Promise<{ code: string; message: string }> {
  return (await respuesta.json()) as { code: string; message: string }
}

describe("envoltorio seguro del endpoint de Better Auth", () => {
  it("devuelve la respuesta de la libreria cuando todo sale bien", async () => {
    const original = new Response("ok", { status: 200 })

    const respuesta = await atenderSolicitudAuth(async () => original)

    expect(respuesta).toBe(original)
    expect(registros).toHaveLength(0)
  })

  it("responde 503 generico cuando la base de datos no esta disponible", async () => {
    const respuesta = await atenderSolicitudAuth(async () => {
      throw Object.assign(new Error(`connect ECONNREFUSED postgresql://u:${SECRETO}@host`), {
        code: "ECONNREFUSED",
      })
    })

    expect(respuesta.status).toBe(503)
    expect((await cuerpoDe(respuesta)).code).toBe("SERVICIO_NO_DISPONIBLE")
    expect(respuesta.headers.get("cache-control")).toBe("no-store")
  })

  it("reconoce el codigo de conexion aunque venga anidado en cause o en errors", async () => {
    const enCause = await atenderSolicitudAuth(async () => {
      throw new Error("Failed query", { cause: Object.assign(new Error("x"), { code: "ECONNREFUSED" }) })
    })
    const enErrors = await atenderSolicitudAuth(async () => {
      throw new Error("Failed query", {
        cause: { errors: [{ code: "ECONNREFUSED" }, { code: "ECONNREFUSED" }] },
      })
    })

    expect(enCause.status).toBe(503)
    expect(enErrors.status).toBe(503)
  })

  it("responde 500 generico ante cualquier otra falla interna", async () => {
    const respuesta = await atenderSolicitudAuth(async () => {
      throw new Error(`select * from "user" where password = '${SECRETO}'`)
    })

    expect(respuesta.status).toBe(500)
    expect((await cuerpoDe(respuesta)).code).toBe("ERROR_INESPERADO")
  })

  it("tambien contiene fallas que no son instancias de Error", async () => {
    const respuesta = await atenderSolicitudAuth(async () => {
      throw SECRETO
    })

    expect(respuesta.status).toBe(500)
  })

  it("nunca incluye detalle interno ni secretos en la respuesta ni en los logs", async () => {
    const respuesta = await atenderSolicitudAuth(async () => {
      throw Object.assign(new Error(`fallo con ${SECRETO} en db.ts:12`), { code: "ECONNREFUSED", stack: `stack con ${SECRETO}` })
    })

    const texto = JSON.stringify(await cuerpoDe(respuesta)) + JSON.stringify(registros)
    expect(texto).not.toContain(SECRETO)
    expect(texto).not.toMatch(/stack|db\.ts|select/i)
    expect(registros).toHaveLength(1)
  })
})
