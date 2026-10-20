import { afterEach, describe, expect, it, vi } from "vitest"
import { leerUrlBd } from "@/lib/infraestructura/db"

const CONTRASENA = "secreto-que-no-debe-aparecer"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("leerUrlBd", () => {
  it("devuelve la URL cuando es valida", () => {
    const url = `postgresql://angel_tears:${CONTRASENA}@localhost:5432/angel_tears_dev`
    vi.stubEnv("DATABASE_URL", url)
    expect(leerUrlBd()).toBe(url)
  })

  it("falla con un mensaje claro si falta la variable", () => {
    vi.stubEnv("DATABASE_URL", "")
    expect(() => leerUrlBd()).toThrow("Falta la variable de entorno DATABASE_URL")
  })

  it("rechaza valores que no son URLs de PostgreSQL sin revelar el valor", () => {
    const invalidos = ["no es una url", `mysql://angel_tears:${CONTRASENA}@localhost/x`]
    for (const valor of invalidos) {
      vi.stubEnv("DATABASE_URL", valor)
      let mensaje = ""
      try {
        leerUrlBd()
      } catch (error) {
        mensaje = error instanceof Error ? error.message : String(error)
      }
      expect(mensaje).not.toBe("")
      expect(mensaje).not.toContain(CONTRASENA)
    }
  })
})
