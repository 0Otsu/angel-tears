import { describe, expect, it } from "vitest"
import type { ProductoParaVender } from "@/lib/modulos/ventas/administracion-contrato"
import { estimarVenta, etiquetaEstadoVenta, formatearFechaOperacion, hoyEnFormatoIso } from "@/lib/presentacion/ventas"

const productos: ProductoParaVender[] = [
  { productoId: "a", nombre: "Anillo", categoriaNombre: "Anillos", precio: "10.10", saldo: 5 },
  { productoId: "b", nombre: "Pulsera", categoriaNombre: "Pulseras", precio: "0.10", saldo: 2 },
]

describe("presentacion de ventas", () => {
  it("formatea la fecha de operacion sin correr el dia", () => {
    expect(formatearFechaOperacion("2026-11-05")).toBe("05/11/2026")
    expect(formatearFechaOperacion("raro")).toBe("raro")
  })

  it("propone la fecha local de hoy", () => {
    expect(hoyEnFormatoIso(new Date(2026, 0, 9, 23, 59))).toBe("2026-01-09")
  })

  it("traduce el estado", () => {
    expect(etiquetaEstadoVenta("CONFIRMADA")).toBe("Confirmada")
    expect(etiquetaEstadoVenta("ANULADA")).toBe("Anulada")
  })

  it("estima subtotales y total exactos y deja en null las lineas incompletas", () => {
    const e = estimarVenta(
      [
        { productoId: "a", cantidad: "2" },
        { productoId: "b", cantidad: "2" },
        { productoId: "", cantidad: "1" },
        { productoId: "a", cantidad: "" },
        { productoId: "a", cantidad: "0" },
      ],
      productos,
    )

    expect(e.subtotales).toEqual(["20.20", "0.20", null, null, null])
    expect(e.total).toBe("20.40")
    expect(e.faltantes).toEqual([])
  })

  it("avisa cuando la demanda total de un producto supera el saldo, sumando lineas repetidas", () => {
    const e = estimarVenta([{ productoId: "b", cantidad: "1" }, { productoId: "b", cantidad: "2" }], productos)

    expect(e.faltantes).toEqual([{ productoId: "b", requerido: 3, disponible: 2 }])
  })
})
