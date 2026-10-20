import { describe, expect, it } from "vitest"
import { centavosADecimal, decimalACentavos, multiplicarCentavos } from "@/lib/modulos/compras/dinero"

describe("decimalACentavos", () => {
  it("convierte enteros y decimales de una o dos posiciones", () => {
    expect(decimalACentavos("10")).toBe(BigInt(1000))
    expect(decimalACentavos("10.5")).toBe(BigInt(1050))
    expect(decimalACentavos("10.05")).toBe(BigInt(1005))
    expect(decimalACentavos("0.01")).toBe(BigInt(1))
  })

  it("rechaza mas de dos decimales sin redondear", () => {
    expect(decimalACentavos("10.001")).toBeNull()
    expect(decimalACentavos("0.999")).toBeNull()
  })

  it("rechaza formatos invalidos, signos, separadores y vacio", () => {
    for (const invalido of ["", "-1", "+1", "1,5", "1.", ".5", "abc", "1e3", " 1", "1 "]) {
      expect(decimalACentavos(invalido)).toBeNull()
    }
  })

  it("mantiene la exactitud en importes grandes donde float falla", () => {
    expect(decimalACentavos("90071992547409.93")).toBe(BigInt("9007199254740993"))
  })
})

describe("centavosADecimal y multiplicarCentavos", () => {
  it("formatea siempre con dos decimales", () => {
    expect(centavosADecimal(BigInt(0))).toBe("0.00")
    expect(centavosADecimal(BigInt(5))).toBe("0.05")
    expect(centavosADecimal(BigInt(123450))).toBe("1234.50")
  })

  it("multiplica de forma exacta", () => {
    expect(centavosADecimal(multiplicarCentavos(BigInt(1005), 3))).toBe("30.15")
  })

  it("rechaza cantidades no enteras o negativas", () => {
    expect(() => multiplicarCentavos(BigInt(100), 1.5)).toThrow(RangeError)
    expect(() => multiplicarCentavos(BigInt(100), -1)).toThrow(RangeError)
  })
})
