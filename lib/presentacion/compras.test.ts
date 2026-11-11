import { describe, expect, it } from "vitest"
import { estimarCompra, etiquetaEstadoCompra, formatearFechaCompra, hoyEnFormatoIso, normalizarCosto } from "@/lib/presentacion/compras"

describe("presentacion de compras", () => {
  it("formatea la fecha sin pasar por Date y propone hoy en hora local", () => {
    expect(formatearFechaCompra("2026-11-05")).toBe("05/11/2026")
    expect(formatearFechaCompra("raro")).toBe("raro")
    expect(hoyEnFormatoIso(new Date(2026, 0, 9, 23, 59))).toBe("2026-01-09")
  })

  it("etiqueta los estados", () => {
    expect(etiquetaEstadoCompra("CONFIRMADA")).toBe("Confirmada")
    expect(etiquetaEstadoCompra("ANULADA")).toBe("Anulada")
  })

  it("normaliza la coma decimal", () => {
    expect(normalizarCosto(" 1500,50 ")).toBe("1500.50")
  })

  it("estima subtotales y total con aritmetica exacta, y deja en null las lineas incompletas", () => {
    const r = estimarCompra([
      { productoId: "a", cantidad: "3", costoUnitario: "10,10" },
      { productoId: "b", cantidad: "2", costoUnitario: "0.35" },
      { productoId: "", cantidad: "1", costoUnitario: "5" },
      { productoId: "c", cantidad: "0", costoUnitario: "5" },
      { productoId: "d", cantidad: "1", costoUnitario: "5.555" },
    ])
    expect(r.subtotales).toEqual(["30.30", "0.70", null, null, null])
    expect(r.total).toBe("31.00")
  })
})
