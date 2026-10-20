import { describe, expect, it } from "vitest"
import { calcularCompra } from "@/lib/modulos/compras/reglas-compra"

describe("calcularCompra", () => {
  it("calcula subtotales y total exactos para varias lineas", () => {
    const resultado = calcularCompra([
      { productoId: "a", cantidad: 3, costoUnitario: "10.05" },
      { productoId: "b", cantidad: 2, costoUnitario: "0.10" },
    ])

    expect(resultado).toEqual({
      ok: true,
      lineas: [
        { productoId: "a", cantidad: 3, costoUnitario: "10.05", numeroLinea: 1, subtotal: "30.15" },
        { productoId: "b", cantidad: 2, costoUnitario: "0.10", numeroLinea: 2, subtotal: "0.20" },
      ],
      total: "30.35",
    })
  })

  it("no fusiona lineas del mismo producto con costos distintos", () => {
    const resultado = calcularCompra([
      { productoId: "a", cantidad: 1, costoUnitario: "5.00" },
      { productoId: "a", cantidad: 1, costoUnitario: "6.00" },
    ])

    expect(resultado.ok && resultado.lineas).toHaveLength(2)
    expect(resultado.ok && resultado.total).toBe("11.00")
  })

  it("rechaza una compra sin lineas", () => {
    expect(calcularCompra([])).toEqual({ ok: false, errores: [], sinLineas: true })
  })

  it("rechaza costos con mas de dos decimales sin registro parcial", () => {
    const resultado = calcularCompra([
      { productoId: "a", cantidad: 1, costoUnitario: "1.00" },
      { productoId: "b", cantidad: 1, costoUnitario: "2.005" },
    ])

    expect(resultado).toEqual({
      ok: false,
      sinLineas: false,
      errores: [{ linea: 1, campo: "costoUnitario", codigo: "IMPORTE_INVALIDO" }],
    })
  })

  it("informa cantidad invalida y producto ausente por linea", () => {
    const resultado = calcularCompra([{ productoId: "", cantidad: 0, costoUnitario: "1.00" }])

    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.errores.map((e) => e.campo)).toEqual(["productoId", "cantidad"])
  })
})
