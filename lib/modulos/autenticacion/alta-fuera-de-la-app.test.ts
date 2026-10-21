import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"

// El alta de la Administradora es un procedimiento operativo, no una funcion de la aplicacion
// (ADR-004): ninguna pagina, accion ni modulo puede importarla ni habilitar el registro.

const raiz = process.cwd()

function archivosDeCodigo(carpeta: string): string[] {
  return (readdirSync(join(raiz, carpeta), { recursive: true }) as string[])
    .map((ruta) => join(carpeta, ruta))
    .filter((ruta) => /\.(ts|tsx|mts)$/.test(ruta) && statSync(join(raiz, ruta)).isFile())
}

function normalizar(ruta: string): string {
  return ruta.split(sep).join("/")
}

describe("el alta de la Administradora queda fuera de la aplicacion", () => {
  const codigoDeLaAplicacion = [...archivosDeCodigo("app"), ...archivosDeCodigo("components"), ...archivosDeCodigo("lib")]
    .map(normalizar)
    .filter((ruta) => !/\.test\.tsx?$/.test(ruta))

  it("ningun archivo de la aplicacion importa el modulo de alta", () => {
    // Solo importaciones reales (import/export ... from "..." o import("...")), no comentarios.
    const importaModuloDeAlta = /(?:from\s*|import\s*\(\s*)["'][^"']*aprovisionar-administradora["']/
    const importadores = codigoDeLaAplicacion.filter(
      (ruta) =>
        ruta !== "lib/modulos/autenticacion/aprovisionar-administradora.ts" &&
        importaModuloDeAlta.test(readFileSync(join(raiz, ruta), "utf8")),
    )

    expect(importadores).toEqual([])
  })

  it("solo la configuracion de auth y el modulo de alta mencionan permitirRegistro", () => {
    const usuarios = codigoDeLaAplicacion.filter((ruta) =>
      readFileSync(join(raiz, ruta), "utf8").includes("permitirRegistro"),
    )

    expect(usuarios.sort()).toEqual([
      "lib/infraestructura/auth-config.ts",
      "lib/modulos/autenticacion/aprovisionar-administradora.ts",
    ])
  })

  it("el script rechaza argumentos sin leer nada ni repetirlos", () => {
    const secreto = "valor-que-no-debe-aparecer-en-la-salida"
    const resultado = spawnSync(
      process.execPath,
      [join(raiz, "node_modules", "tsx", "dist", "cli.mjs"), "scripts/auth/crear-administradora.ts", `--contrasena=${secreto}`],
      { cwd: raiz, encoding: "utf8", env: { ...process.env, DATABASE_URL: "", ADMIN_CONTRASENA: "" } },
    )

    expect(resultado.status).toBe(1)
    expect(resultado.stderr).toContain("no acepta argumentos")
    expect(resultado.stdout + resultado.stderr).not.toContain(secreto)
    expect(relative(raiz, join(raiz, "scripts"))).toBe("scripts")
  })
})
