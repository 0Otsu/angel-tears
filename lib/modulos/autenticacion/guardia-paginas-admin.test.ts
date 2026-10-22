import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, sep } from "node:path"
import { describe, expect, it } from "vitest"

// Toda pagina del panel debe exigir sesion por su cuenta (ADR-004, tarea 2.4): un layout no se
// vuelve a ejecutar al navegar entre paginas, asi que no alcanza con protegerlo a el. Esta prueba
// impide agregar una pagina nueva bajo app/admin/(panel)/ sin la guardia (por ejemplo, las que
// sumen Productos o Compras) y que la pagina de login pierda la redireccion si ya hay sesion.

const raiz = process.cwd()
const panel = join(raiz, "app", "admin", "(panel)")

function archivos(carpeta: string): string[] {
  return (readdirSync(carpeta, { recursive: true }) as string[])
    .map((ruta) => join(carpeta, ruta))
    .filter((ruta) => statSync(ruta).isFile())
}

const relativa = (ruta: string) => ruta.replace(raiz + sep, "").split(sep).join("/")

describe("proteccion del panel de administracion", () => {
  const paginas = archivos(panel).filter((ruta) => /(^|[\\/])page\.tsx$/.test(ruta))

  it("hay paginas del panel que comprobar", () => {
    expect(paginas.length).toBeGreaterThanOrEqual(9)
  })

  it.each(paginas.map(relativa))("%s exige sesion en el servidor", (ruta) => {
    const codigo = readFileSync(join(raiz, ruta), "utf8")

    expect(codigo).toMatch(/await\s+exigirAdministradoraEnPagina\(\)/)
  })

  it("el layout del panel exige sesion antes de entregar el shell", () => {
    const codigo = readFileSync(join(panel, "layout.tsx"), "utf8")

    expect(codigo).toMatch(/await\s+exigirAdministradoraEnPagina\(\)/)
  })

  it("las paginas del panel no son componentes de cliente (la guardia corre en el servidor)", () => {
    for (const ruta of [...paginas, join(panel, "layout.tsx")]) {
      expect(readFileSync(ruta, "utf8"), relativa(ruta)).not.toMatch(/^\s*["']use client["']/m)
    }
  })

  it("la pagina de login lleva al panel cuando ya hay una sesion valida", () => {
    const codigo = readFileSync(join(raiz, "app", "admin", "login", "page.tsx"), "utf8")

    expect(codigo).toMatch(/await\s+redirigirAlPanelSiHaySesion\(\)/)
  })
})
