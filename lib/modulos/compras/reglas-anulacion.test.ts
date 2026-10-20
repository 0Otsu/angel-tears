import { describe, expect, it } from "vitest"
import { planificarAnulacion } from "@/lib/modulos/compras/reglas-anulacion"

const compra = {
  estado: "CONFIRMADA" as const,
  lineas: [
    { productoId: "a", cantidad: 3 },
    { productoId: "b", cantidad: 2 },
  ],
}

describe("planificarAnulacion", () => {
  it("revierte una reversa por linea cuando el stock alcanza", () => {
    const plan = planificarAnulacion(compra, new Map([["a", 3], ["b", 10]]))

    expect(plan).toEqual({
      tipo: "APLICAR",
      reversas: [
        { productoId: "a", delta: -3 },
        { productoId: "b", delta: -2 },
      ],
    })
  })

  it("bloquea toda la anulacion si el stock fue consumido, e informa cada faltante", () => {
    const plan = planificarAnulacion(compra, new Map([["a", 1], ["b", 0]]))

    expect(plan).toEqual({
      tipo: "BLOQUEADA",
      faltantes: [
        { productoId: "a", disponible: 1, requerido: 3 },
        { productoId: "b", disponible: 0, requerido: 2 },
      ],
    })
  })

  it("alcanza con que un solo producto falle para bloquear todo", () => {
    const plan = planificarAnulacion(compra, new Map([["a", 100], ["b", 1]]))

    expect(plan.tipo).toBe("BLOQUEADA")
  })

  it("evalua juntas las lineas repetidas del mismo producto", () => {
    const repetida = {
      estado: "CONFIRMADA" as const,
      lineas: [
        { productoId: "a", cantidad: 2 },
        { productoId: "a", cantidad: 2 },
      ],
    }

    expect(planificarAnulacion(repetida, new Map([["a", 3]])).tipo).toBe("BLOQUEADA")
    const plan = planificarAnulacion(repetida, new Map([["a", 4]]))
    expect(plan.tipo === "APLICAR" && plan.reversas).toHaveLength(2)
  })

  it("una compra ya anulada no repite ningun efecto, aunque falte stock", () => {
    expect(planificarAnulacion({ ...compra, estado: "ANULADA" }, new Map())).toEqual({
      tipo: "YA_ANULADA",
    })
  })

  it("falla de forma explicita si falta el saldo de un producto", () => {
    expect(() => planificarAnulacion(compra, new Map([["a", 5]]))).toThrow()
  })
})
