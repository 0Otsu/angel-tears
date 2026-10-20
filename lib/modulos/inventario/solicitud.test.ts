import { describe, expect, it } from "vitest"
import { calcularHuellaSolicitud, clasificarSolicitud } from "@/lib/modulos/inventario/solicitud"

describe("calcularHuellaSolicitud", () => {
  it("no depende del orden de las claves", () => {
    expect(calcularHuellaSolicitud({ a: 1, b: { x: 1, y: 2 } })).toBe(
      calcularHuellaSolicitud({ b: { y: 2, x: 1 }, a: 1 }),
    )
  })

  it("conserva el orden de los arreglos, que importa en las lineas", () => {
    expect(calcularHuellaSolicitud([1, 2])).not.toBe(calcularHuellaSolicitud([2, 1]))
  })

  it("cambia ante cualquier diferencia de contenido", () => {
    expect(calcularHuellaSolicitud({ cantidad: 1 })).not.toBe(calcularHuellaSolicitud({ cantidad: 2 }))
    expect(calcularHuellaSolicitud({ n: "1" })).not.toBe(calcularHuellaSolicitud({ n: 1 }))
  })
})

describe("clasificarSolicitud", () => {
  it("sin operacion previa es nueva", () => {
    expect(clasificarSolicitud(null, "h1")).toBe("NUEVA")
  })

  it("misma clave y mismo contenido es una repeticion", () => {
    expect(clasificarSolicitud("h1", "h1")).toBe("REPETIDA")
  })

  it("misma clave con otro contenido es un conflicto", () => {
    expect(clasificarSolicitud("h1", "h2")).toBe("CONFLICTO")
  })
})
