import { describe, expect, it } from "vitest"
import { evaluarAjuste } from "@/lib/modulos/inventario/reglas-ajuste"

describe("evaluarAjuste", () => {
  it("un incremento produce un delta positivo y recorta el motivo", () => {
    expect(evaluarAjuste({ tipo: "INCREMENTO", cantidad: 3, motivo: "  hallazgo  " })).toEqual({
      ok: true,
      tipo: "INCREMENTO",
      cantidad: 3,
      motivo: "hallazgo",
      delta: 3,
    })
  })

  it("un decremento produce un delta negativo", () => {
    const resultado = evaluarAjuste({ tipo: "DECREMENTO", cantidad: 2, motivo: "rotura" })

    expect(resultado.ok && resultado.delta).toBe(-2)
  })

  it("el saldo inicial suma existencias con el motivo exigido", () => {
    const resultado = evaluarAjuste({ tipo: "INICIAL", cantidad: 10, motivo: "existencias previas" })

    expect(resultado.ok && resultado.delta).toBe(10)
  })

  it("rechaza un motivo ausente o solo con espacios", () => {
    for (const motivo of [undefined, "", "   "]) {
      const resultado = evaluarAjuste({ tipo: "INCREMENTO", cantidad: 1, motivo })
      expect(resultado).toEqual({ ok: false, errores: [{ campo: "motivo", codigo: "REQUERIDO" }] })
    }
  })

  it("rechaza cantidades no enteras, cero o negativas", () => {
    for (const cantidad of [0, -1, 1.5, "2", undefined]) {
      const resultado = evaluarAjuste({ tipo: "INCREMENTO", cantidad, motivo: "x" })
      expect(!resultado.ok && resultado.errores[0]).toEqual({
        campo: "cantidad",
        codigo: "CANTIDAD_INVALIDA",
      })
    }
  })

  it("rechaza un tipo desconocido, por ejemplo un reemplazo directo del saldo", () => {
    const resultado = evaluarAjuste({ tipo: "REEMPLAZO", cantidad: 5, motivo: "x" })

    expect(!resultado.ok && resultado.errores).toEqual([{ campo: "tipo", codigo: "TIPO_INVALIDO" }])
  })

  it("informa todos los errores a la vez", () => {
    const resultado = evaluarAjuste({ tipo: null, cantidad: 0, motivo: "" })

    expect(!resultado.ok && resultado.errores.map((e) => e.campo)).toEqual([
      "tipo",
      "cantidad",
      "motivo",
    ])
  })
})
