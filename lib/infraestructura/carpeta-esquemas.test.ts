import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Drizzle Kit (drizzle.config.ts) carga TODO archivo .ts de esta carpeta como schema. Si alguien
// deja ahi un test, un helper o cualquier archivo que importe Vitest u otras dependencias de
// desarrollo, `pnpm db:generate` falla. Los tests de los schemas viven junto a lib/infraestructura.
const carpeta = join(process.cwd(), "lib", "infraestructura", "esquemas")

describe("carpeta de schemas de Drizzle", () => {
  it("solo contiene archivos de schema, sin tests ni archivos auxiliares", () => {
    const archivos = readdirSync(carpeta)

    expect(archivos.length).toBeGreaterThan(0)
    for (const archivo of archivos) {
      expect(archivo, `${archivo} no es un schema`).toMatch(/^[a-z][a-z0-9-]*\.ts$/)
      expect(archivo, `${archivo} parece un test`).not.toMatch(/\.(test|spec|integracion)\./)
    }
  })

  it("coincide con el patron que lee drizzle.config.ts", () => {
    const configuracion = readFileSync(join(process.cwd(), "drizzle.config.ts"), "utf8")

    expect(configuracion).toContain("./lib/infraestructura/esquemas/*.ts")
  })
})
