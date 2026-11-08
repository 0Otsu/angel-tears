import { describe, expect, it } from "vitest"
import {
  calcularSaldoResultante,
  consolidarVariaciones,
  esCantidadPositiva,
  esMinimoValido,
  esStockBajo,
} from "@/lib/modulos/inventario/reglas-stock"

describe("esStockBajo general", () => {
  it.each([0,1,2,3,4])("saldo %s aplica umbral general e ignora todos los minimos historicos", saldo => {
    for (const minimo of [null,0,1,3,5,10]) expect(esStockBajo(saldo,minimo)).toBe(saldo<=3)
    expect(esStockBajo(saldo)).toBe(saldo<=3)
  })
})

describe("validaciones de cantidad y minimo", () => {
  it("la cantidad debe ser un entero positivo", () => {
    expect(esCantidadPositiva(1)).toBe(true)
    for (const invalido of [0, -1, 1.5, Number.NaN, Infinity, "3", null, undefined]) {
      expect(esCantidadPositiva(invalido)).toBe(false)
    }
  })

  it("el minimo acepta null y enteros no negativos, y distingue null de cero", () => {
    expect(esMinimoValido(null)).toBe(true)
    expect(esMinimoValido(0)).toBe(true)
    expect(esMinimoValido(7)).toBe(true)
    for (const invalido of [-1, 0.5, Number.NaN, "0", undefined]) {
      expect(esMinimoValido(invalido)).toBe(false)
    }
  })
})

describe("consolidarVariaciones", () => {
  it("suma las variaciones del mismo producto en una sola demanda", () => {
    const resultado = consolidarVariaciones([
      { productoId: "b", delta: -2 },
      { productoId: "b", delta: -3 },
      { productoId: "a", delta: 4 },
    ])

    expect(resultado).toEqual([
      { productoId: "a", delta: 4 },
      { productoId: "b", delta: -5 },
    ])
  })

  it("ordena por ID de producto sin importar el orden de entrada (orden de locks)", () => {
    const resultado = consolidarVariaciones([
      { productoId: "c", delta: 1 },
      { productoId: "a", delta: 1 },
      { productoId: "b", delta: 1 },
    ])

    expect(resultado.map((r) => r.productoId)).toEqual(["a", "b", "c"])
  })

  it("conserva un producto cuyo neto es cero, porque igual debe bloquearse", () => {
    const resultado = consolidarVariaciones([
      { productoId: "a", delta: 3 },
      { productoId: "a", delta: -3 },
    ])

    expect(resultado).toEqual([{ productoId: "a", delta: 0 }])
  })

  it("rechaza variaciones cero o no enteras", () => {
    expect(() => consolidarVariaciones([{ productoId: "a", delta: 0 }])).toThrow(RangeError)
    expect(() => consolidarVariaciones([{ productoId: "a", delta: 1.5 }])).toThrow(RangeError)
  })
})

describe("calcularSaldoResultante", () => {
  it("incrementa y decrementa dentro del saldo", () => {
    expect(calcularSaldoResultante(3, 2)).toEqual({ ok: true, saldoResultante: 5 })
    expect(calcularSaldoResultante(3, -3)).toEqual({ ok: true, saldoResultante: 0 })
  })

  it("rechaza un decremento que dejaria saldo negativo e informa el disponible", () => {
    expect(calcularSaldoResultante(2, -3)).toEqual({ ok: false, disponible: 2, requerido: 3 })
  })
})
