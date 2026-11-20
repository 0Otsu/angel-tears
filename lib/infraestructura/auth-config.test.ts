import { afterEach, describe, expect, it, vi } from "vitest"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { crearAuth, leerConfiguracionAuthWeb } from "./auth-config"

vi.mock("better-auth/adapters/drizzle", async () => {
  const { memoryAdapter } = await import("better-auth/adapters/memory")
  return { drizzleAdapter: () => memoryAdapter({ rateLimit: [], user: [] }) }
})

const origen = "https://tienda.example"

afterEach(() => vi.unstubAllEnvs())

describe("configuración web de Better Auth", () => {
  it.each([undefined, "http://tienda.example", "https://tienda.example/ruta", "https://u:p@tienda.example"])(
    "exige un origen explícito y sin credenciales ni ruta (%s)", (BETTER_AUTH_URL) => {
      expect(() => leerConfiguracionAuthWeb({ BETTER_AUTH_URL })).toThrow("BETTER_AUTH_URL")
    },
  )

  it("acepta HTTP solo para desarrollo local y normaliza la cabecera configurada", () => {
    expect(leerConfiguracionAuthWeb({
      BETTER_AUTH_URL: "http://127.0.0.1:3000/",
      BETTER_AUTH_TRUSTED_IP_HEADER: " X-Real-IP ",
    })).toEqual({ origen: "http://127.0.0.1:3000", cabecerasIp: ["x-real-ip"] })
    expect(() => leerConfiguracionAuthWeb({
      BETTER_AUTH_URL: origen, BETTER_AUTH_TRUSTED_IP_HEADER: "x-real-ip, x-forwarded-for",
    })).toThrow("BETTER_AUTH_TRUSTED_IP_HEADER")
  })

  it("mantiene un límite de login sin cabecera de proxy configurada", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secreto-aleatorio-aislado-solo-para-pruebas-web")
    const auth = crearAuth({} as NodePgDatabase, {
      web: leerConfiguracionAuthWeb({ BETTER_AUTH_URL: origen }),
    })
    for (let intento = 0; intento < 4; intento++) {
      const respuesta = await auth.handler(new Request(`${origen}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { origin: origen, "content-type": "application/json", "x-forwarded-for": `192.0.2.${intento + 1}` },
        body: "{}",
      }))
      expect(respuesta.status).toBe(intento < 3 ? 400 : 429)
    }
    const cambiarPerfil = await auth.handler(new Request(`${origen}/api/auth/update-user`, { method: "POST" }))
    expect(cambiarPerfil.status).toBe(404)
  })
})
